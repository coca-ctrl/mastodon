# frozen_string_literal: true

class Api::V1::StorySoundsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index]
  before_action -> { doorkeeper_authorize! :write }, only: [:create, :update, :destroy]
  before_action :require_user!
  before_action :require_npc_permission!
  before_action :set_story_sound, only: [:update, :destroy]

  def index
    sounds = StorySound.where(account_id: current_account.id).order(created_at: :asc).to_a
    counts = Status.where(story_sound_id: sounds.map(&:id)).reorder(nil).group(:story_sound_id).count

    render json: {
      sounds: sounds.map { |sound| serialize_sound(sound, counts[sound.id] || 0) },
      limits: {
        max_sounds: StorySound::MAX_PER_ACCOUNT,
        max_size_mb: StorySound::MAX_SIZE / 1.megabyte,
        max_seconds: StorySound::MAX_DURATION.to_i,
      },
    }
  end

  def create
    sound = StorySound.new(account_id: current_account.id, name: params[:name].to_s.strip)
    sound.file = params[:file] if params[:file].respond_to?(:content_type)
    sound.save!

    render json: serialize_sound(sound, 0), status: :created
  end

  def update
    @story_sound.update!(name: params[:name].to_s.strip)

    render json: serialize_sound(@story_sound, used_count(@story_sound))
  end

  # 사용 중인 게시물이 있어도 삭제할 수 있다. 해당 게시물은 효과음 없이 표시된다.
  def destroy
    @story_sound.destroy!

    render json: { success: true }
  end

  private

  def require_npc_permission!
    render json: { error: '권한이 없습니다.' }, status: :forbidden unless current_user&.can?(:manage_npcs)
  end

  def set_story_sound
    @story_sound = StorySound.where(account_id: current_account.id).find(params[:id])
  end

  def used_count(sound)
    Status.where(story_sound_id: sound.id).reorder(nil).count
  end

  def serialize_sound(sound, used_count)
    {
      id: sound.id.to_s,
      name: sound.name,
      url: sound.file.url,
      duration_ms: sound.duration_ms,
      file_size: sound.file_file_size,
      used_count: used_count,
    }
  end
end
