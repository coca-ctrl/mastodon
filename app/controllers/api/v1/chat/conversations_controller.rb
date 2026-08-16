# frozen_string_literal: true

class Api::V1::Chat::ConversationsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index, :read]
  before_action -> { doorkeeper_authorize! :write }, only: [:create]
  before_action :require_user!
  before_action :set_conversation, only: [:read, :show, :leave, :update]

  # GET /api/v1/chat/conversations
  def index
    conversations = current_user.chat_conversations
                                 .joins(:chat_conversation_participants)
                                 .where(chat_conversation_participants: { user_id: current_user.id, left_at: nil })
                                 .distinct
                                 .order(updated_at: :desc)

    render json: conversations.map { |c| serialize_conversation(c) }
  end

  # POST /api/v1/chat/conversations
  # params: { account_ids: [1,2], group: true/false, name: "옵션" }
  def create
    account_ids = Array(params[:account_ids]).map(&:to_i).uniq
    target_accounts = Account.where(id: account_ids, domain: nil).to_a

    if target_accounts.empty?
      render json: { error: '대화 상대가 필요합니다.' }, status: :unprocessable_entity
      return
    end

    target_users = target_accounts.filter_map(&:user)
    target_user_ids = target_users.map(&:id) - [current_user.id]

    if target_user_ids.empty?
      render json: { error: '유효한 대화 상대가 없습니다.' }, status: :unprocessable_entity
      return
    end

    is_group = ActiveModel::Type::Boolean.new.cast(params[:group]) || target_user_ids.size > 1

    unless is_group
      existing = find_existing_direct_conversation(target_user_ids.first)
      if existing
        render json: serialize_conversation(existing)
        return
      end
    end

    conversation = ChatConversation.create!(
      group: is_group,
      name: is_group ? params[:name] : nil,
      owner: is_group ? current_user : nil
    )

    all_user_ids = (target_user_ids + [current_user.id]).uniq
    all_user_ids.each do |uid|
      conversation.chat_conversation_participants.create!(user_id: uid, joined_at: Time.current)
    end

    if is_group
      current_display_name = current_account&.display_name.presence || current_account&.username
      ChatMessage.create_system_message!(
        conversation,
        "#{current_display_name}님이 대화방을 시작했습니다."
      )
    end

    render json: serialize_conversation(conversation), status: :created
  end

  # POST /api/v1/chat/conversations/:id/read
  def read
    participant = @conversation.chat_conversation_participants.find_by(user_id: current_user.id)

    unless participant
      render json: { error: '참여자가 아닙니다.' }, status: :forbidden
      return
    end

    participant.update!(last_read_at: Time.current)
    render json: { success: true }
  end

  # POST /api/v1/chat/conversations/:id/leave
  def leave
    participant = @conversation.chat_conversation_participants.find_by(user_id: current_user.id, left_at: nil)

    unless participant
      render json: { error: '참여자가 아닙니다.' }, status: :forbidden
      return
    end

    participant.update!(left_at: Time.current)
    ChatMessage.create_system_message!(@conversation, "#{current_account&.username}님이 나갔습니다.")
    render json: { success: true }
  end

  # GET /api/v1/chat/conversations/:id
  def show
    unless @conversation.chat_conversation_participants.exists?(user_id: current_user.id)
      render json: { error: '참여자가 아닙니다.' }, status: :forbidden
      return
    end

    render json: serialize_conversation(@conversation)
  end

  # PATCH/PUT /api/v1/chat/conversations/:id
  def update
    unless @conversation.owner_id == current_user.id
      render json: { error: '방장만 이름을 변경할 수 있습니다.' }, status: :forbidden
      return
    end

    @conversation.update!(name: params[:name])
    render json: serialize_conversation(@conversation)
  end

  private

  def set_conversation
    @conversation = ChatConversation.find(params[:id])
  end

  def find_existing_direct_conversation(other_user_id)
    current_user.chat_conversations
                 .where(group: false)
                 .joins(:chat_conversation_participants)
                 .where(chat_conversation_participants: { user_id: other_user_id, left_at: nil })
                 .first
  end

  def serialize_conversation(conversation)
  participant = conversation.chat_conversation_participants.find_by(user_id: current_user.id)
  last_message = conversation.chat_messages.visible.order(created_at: :desc).first

  active_user_ids = conversation.chat_conversation_participants
                                 .where(left_at: nil)
                                 .pluck(:user_id)

  last_activity = conversation.chat_messages
                               .where(sender_id: active_user_ids, message_type: 'user')
                               .group(:sender_id)
                               .maximum(:created_at)

  active_users = User.where(id: active_user_ids)
                      .sort_by { |u| last_activity[u.id] || Time.at(0) }
                      .reverse

  {
    id: conversation.id,
    group: conversation.group,
    name: conversation.name,
    owner_id: conversation.owner&.account&.id&.to_s,
    participants: active_users.map { |u| serialize_user(u) },
    last_message: last_message && serialize_message(last_message),
    unread_count: participant&.unread_count || 0,
    updated_at: conversation.updated_at,
  }
end

  def serialize_user(user)
    {
      id: user.id,
      username: user.account&.username,
      display_name: user.account&.display_name.presence || user.account&.username,
      avatar: user.account&.avatar&.url,
    }
  end

  def serialize_message(message)
    sender_account = message.sender&.account
    {
      id: message.id,
      message_type: message.message_type,
      sender_id: message.sender_id,
      sender_account_id: sender_account&.id&.to_s,
      sender_username: sender_account&.username,
      sender_display_name: sender_account&.display_name.presence || sender_account&.username,
      sender_avatar: sender_account&.avatar&.url,
      content: message.deleted? ? nil : message.content,
      media_url: message.deleted? ? nil : message.media_attachment&.file&.url,
      deleted: message.deleted?,
      edited: message.edited,
      created_at: message.created_at,
    }
  end
end