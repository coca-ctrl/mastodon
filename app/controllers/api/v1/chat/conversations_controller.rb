# frozen_string_literal: true

class Api::V1::Chat::ConversationsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index, :read]
  before_action -> { doorkeeper_authorize! :write }, only: [:create]
  before_action :require_user!
  before_action :set_conversation, only: [:read, :show]

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

  # GET /api/v1/chat/conversations/:id
  def show
    unless @conversation.chat_conversation_participants.exists?(user_id: current_user.id)
      render json: { error: '참여자가 아닙니다.' }, status: :forbidden
      return
    end

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

    {
      id: conversation.id,
      group: conversation.group,
      name: conversation.name,
      participants: conversation.participants.map { |u| serialize_user(u) },
      last_message: last_message && serialize_message(last_message),
      unread_count: participant&.unread_count || 0,
      updated_at: conversation.updated_at,
    }
  end

  def serialize_user(user)
    {
      id: user.id,
      username: user.account&.username,
      display_name: user.account&.display_name,
      avatar: user.account&.avatar&.url,
    }
  end

  def serialize_message(message)
    {
      id: message.id,
      sender_id: message.sender_id,
      sender_account_id: message.sender.account&.id&.to_s,
      content: message.deleted? ? nil : message.content,
      media_url: message.deleted? ? nil : message.media_attachment&.file&.url,
      deleted: message.deleted?,
      edited: message.edited,
      created_at: message.created_at,
    }
  end
end