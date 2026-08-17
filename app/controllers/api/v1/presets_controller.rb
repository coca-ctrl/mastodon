# frozen_string_literal: true

class Api::V1::PresetsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write }, only: [:create, :update, :destroy]
  before_action :require_user!
  before_action :require_npc_permission!
  before_action :set_preset, only: [:show, :update, :destroy]

  def index
    presets = current_account.presets.includes(:npc, :background).order(created_at: :asc)
    render json: presets.map { |preset| serialize_preset(preset) }
  end

  def show
    render json: serialize_preset(@preset)
  end

  def create
    npc = current_account.npcs.find(params.require(:npc_id))
    background = params[:background_id].present? ? current_account.backgrounds.find(params[:background_id]) : nil

    preset = current_account.presets.create!(
      name: params.require(:name),
      npc: npc,
      npc_emotion: params.require(:npc_emotion),
      background: background
    )
    render json: serialize_preset(preset), status: :created
  end

  def update
    npc = params[:npc_id].present? ? current_account.npcs.find(params[:npc_id]) : @preset.npc
    background = if params.key?(:background_id)
                   params[:background_id].present? ? current_account.backgrounds.find(params[:background_id]) : nil
                 else
                   @preset.background
                 end

    @preset.update!(
      name: params[:name] || @preset.name,
      npc: npc,
      npc_emotion: params[:npc_emotion] || @preset.npc_emotion,
      background: background
    )
    render json: serialize_preset(@preset)
  end

  def destroy
    @preset.destroy!
    render json: { success: true }
  end

  private

  def require_npc_permission!
    render json: { error: '권한이 없습니다.' }, status: :forbidden unless current_user&.can?(:manage_npcs)
  end

  def set_preset
    @preset = current_account.presets.find(params[:id])
  end

  def serialize_preset(preset)
    image = preset.npc.image_for(preset.npc_emotion.presence || 'default')
    {
      id: preset.id,
      name: preset.name,
      npc_id: preset.npc_id,
      npc_name: preset.npc.name,
      npc_emotion: preset.npc_emotion,
      npc_image_url: image&.image&.url(:thumb),
      background_id: preset.background_id,
      background_name: preset.background&.name,
      background_thumb_url: preset.background&.image&.url(:thumb),
    }
  end
end