# frozen_string_literal: true

class Api::V1::CardPresetsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index, :show, :options]
  before_action -> { doorkeeper_authorize! :write }, only: [:create, :update, :destroy]
  before_action :require_user!
  before_action :require_npc_permission!
  before_action :set_card_preset, only: [:show, :update, :destroy]

  PERMITTED_FIELDS = %i(
    name
    background_color background_size background_position background_repeat
    border_width border_style border_color border_radius
    border_image_slice border_image_width border_image_repeat
    text_color font_key font_weight font_size line_height padding
  ).freeze

  def index
    presets = CardPreset.where(account_id: current_account.id).order(created_at: :asc).to_a
    counts = Status.where(card_preset_id: presets.map(&:id)).reorder(nil).group(:card_preset_id).count

    render json: presets.map { |preset| serialize_preset(preset, counts[preset.id] || 0) }
  end

  def show
    render json: serialize_preset(@card_preset, used_count(@card_preset))
  end

  def create
    preset = CardPreset.new(account_id: current_account.id)
    assign_preset_attributes(preset)
    preset.save!

    render json: serialize_preset(preset, 0), status: :created
  end

  def update
    assign_preset_attributes(@card_preset)
    @card_preset.save!

    render json: serialize_preset(@card_preset, used_count(@card_preset))
  end

  def destroy
    count = used_count(@card_preset)

    if count.positive?
      render json: { error: "사용 중인 게시물이 #{count}개 있어 삭제할 수 없습니다.", used_count: count }, status: :unprocessable_entity
      return
    end

    @card_preset.destroy!
    render json: { success: true }
  end

  # 편집기에서 쓰는 선택지와 한도
  def options
    render json: {
      fonts: CardPreset::FONTS.map { |key, font| { key: key, label: font[:label], family: font[:family], weights: font[:weights] } },
      border_styles: CardPreset::BORDER_STYLES,
      background_sizes: CardPreset::BACKGROUND_SIZES,
      background_positions: CardPreset::BACKGROUND_POSITIONS,
      background_repeats: CardPreset::BACKGROUND_REPEATS,
      border_image_repeats: CardPreset::BORDER_IMAGE_REPEATS,
      gradient_types: CardPreset::GRADIENT_TYPES,
      limits: { max_presets: CardPreset::MAX_PER_ACCOUNT, background_image_mb: 3, border_image_mb: 2 },
    }
  end

  private

  def require_npc_permission!
    render json: { error: '권한이 없습니다.' }, status: :forbidden unless current_user&.can?(:manage_npcs)
  end

  def set_card_preset
    @card_preset = CardPreset.where(account_id: current_account.id).find(params[:id])
  end

  def used_count(preset)
    Status.where(card_preset_id: preset.id).reorder(nil).count
  end

  def assign_preset_attributes(preset)
    preset.assign_attributes(params.permit(*PERMITTED_FIELDS))
    preset.background_gradient = parse_gradient if params.key?(:background_gradient)

    preset.background_image = params[:background_image] if params[:background_image].respond_to?(:content_type)
    preset.border_image = params[:border_image] if params[:border_image].respond_to?(:content_type)

    preset.background_image = nil if truthy?(params[:remove_background_image])
    preset.border_image = nil if truthy?(params[:remove_border_image])
  end

  # FormData(JSON 문자열)와 JSON 본문 둘 다 받는다. 형식이 깨졌으면 모델 검증에서 걸러진다.
  def parse_gradient
    raw = params[:background_gradient]
    return nil if raw.blank?
    return raw.to_unsafe_h if raw.respond_to?(:to_unsafe_h)

    JSON.parse(raw.to_s)
  rescue JSON::ParserError
    { 'invalid' => true }
  end

  def truthy?(value)
    ActiveModel::Type::Boolean.new.cast(value)
  end

  def serialize_preset(preset, used_count)
    json = preset.as_style_json
    thumb_url = preset.background_image.file? ? preset.background_image.url(:thumb) : nil

    json.merge(
      name: preset.name,
      used_count: used_count,
      background: json[:background].merge(thumb_url: thumb_url)
    )
  end
end