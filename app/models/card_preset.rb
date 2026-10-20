# frozen_string_literal: true

# 타임라인 게시물을 카드로 보여주기 위한 스타일 프리셋.
# 임의 CSS를 저장하지 않고, 검증된 필드만 저장한다.
class CardPreset < ApplicationRecord
  MAX_PER_ACCOUNT = 20
  COLOR_PATTERN = /\A#\h{6}(?:\h{2})?\z/

  FONTS = {
    'pretendard' => { label: 'Pretendard', family: "'Pretendard', sans-serif", weights: [400, 500, 700] },
    'noto_sans_kr' => { label: 'Noto Sans KR', family: "'Noto Sans KR', sans-serif", weights: [400, 500, 700] },
    'noto_serif_kr' => { label: 'Noto Serif KR', family: "'Noto Serif KR', serif", weights: [400, 600, 700] },
    'kmu_sunggok_serif' => { label: '국민대 성곡서체', family: "'KookminUniversitySunggokSerif', serif", weights: [400] },
    'nalssaendori' => { label: '날쌘돌이', family: "'Nalssaendori', sans-serif", weights: [300, 500, 600] },
    'incheon_education' => { label: '인천교육 자람', family: "'IncheonEducation', sans-serif", weights: [400] },
  }.freeze

  BORDER_STYLES = %w(solid dashed dotted double groove ridge).freeze
  BACKGROUND_SIZES = %w(cover contain auto).freeze
  BACKGROUND_POSITIONS = %w(center top bottom left right).freeze
  BACKGROUND_REPEATS = %w(no-repeat repeat repeat-x repeat-y).freeze
  BORDER_IMAGE_REPEATS = %w(stretch repeat round space).freeze
  GRADIENT_TYPES = %w(linear radial).freeze
  COLOR_ATTRIBUTES = %i(background_color border_color text_color).freeze

  belongs_to :account

  has_attached_file :background_image,
                    styles: {
                      original: '1600x1200>',
                      thumb: '200x150>',
                    },
                    convert_options: { all: '-strip' }

  has_attached_file :border_image,
                    styles: { original: '2048x2048>' },
                    convert_options: { all: '-strip' }

  validates_attachment_content_type :background_image, content_type: %w(image/jpeg image/png image/webp)
  validates_attachment_size :background_image, less_than: 3.megabytes
  do_not_validate_attachment_file_type :background_image

  validates_attachment_content_type :border_image, content_type: %w(image/jpeg image/png image/webp)
  validates_attachment_size :border_image, less_than: 2.megabytes
  do_not_validate_attachment_file_type :border_image

  validates :name, presence: true, length: { maximum: 30 }
  validates :background_size, inclusion: { in: BACKGROUND_SIZES }
  validates :background_position, inclusion: { in: BACKGROUND_POSITIONS }
  validates :background_repeat, inclusion: { in: BACKGROUND_REPEATS }
  validates :border_width, numericality: { only_integer: true, in: 0..32 }
  validates :border_style, inclusion: { in: BORDER_STYLES }
  validates :border_radius, numericality: { only_integer: true, in: 0..64 }
  validates :border_image_slice, numericality: { only_integer: true, in: 1..1000 }
  validates :border_image_width, numericality: { only_integer: true, in: 1..64 }
  validates :border_image_repeat, inclusion: { in: BORDER_IMAGE_REPEATS }
  validates :font_key, inclusion: { in: FONTS.keys }
  validates :font_size, numericality: { only_integer: true, in: 12..28 }
  validates :line_height, numericality: { only_integer: true, in: 100..250 }
  validates :padding, numericality: { only_integer: true, in: 0..48 }

  validate :colors_valid
  validate :gradient_valid
  validate :font_weight_supported
  validate :within_account_limit, on: :create

  before_validation :normalize_colors
  before_validation :normalize_gradient

  # 화면 렌더링에 필요한 값만 담은 구조 (관리 API와 게시물 직렬화에서 함께 사용)
  def as_style_json
    font = FONTS[font_key] || FONTS['pretendard']

    {
      id: id,
      background: {
        color: background_color,
        gradient: background_gradient,
        image_url: background_image.file? ? background_image.url(:original) : nil,
        size: background_size,
        position: background_position,
        repeat: background_repeat,
      },
      border: {
        width: border_width,
        style: border_style,
        color: border_color,
        radius: border_radius,
        image_url: border_image.file? ? border_image.url(:original) : nil,
        image_slice: border_image_slice,
        image_width: border_image_width,
        image_repeat: border_image_repeat,
      },
      text: {
        color: text_color,
        font_key: font_key,
        font_family: font[:family],
        font_weight: font_weight,
        font_size: font_size,
        line_height: line_height,
      },
      padding: padding,
    }
  end

  private

  def normalize_colors
    COLOR_ATTRIBUTES.each do |attribute|
      value = self[attribute].to_s.strip
      self[attribute] = value.presence
    end
  end

  def normalize_gradient
    @gradient_invalid = false
    raw = background_gradient

    if raw.blank?
      self.background_gradient = nil
      return
    end

    cleaned = clean_gradient(raw)

    if cleaned
      self.background_gradient = cleaned
    else
      @gradient_invalid = true
    end
  end

  # 허용된 키만 남기고 값을 검증한다. 잘못되면 nil
  def clean_gradient(raw)
    return unless raw.is_a?(Hash)

    raw = raw.deep_stringify_keys
    type = raw['type']
    stops = raw['stops']
    return unless GRADIENT_TYPES.include?(type) && stops.is_a?(Array) && stops.size.between?(2, 6)

    clean_stops = stops.map do |stop|
      return nil unless stop.is_a?(Hash)

      color = stop['color'].to_s
      position = Integer(stop['position'].to_s, exception: false)
      return nil unless color.match?(COLOR_PATTERN) && position&.between?(0, 100)

      { 'color' => color, 'position' => position }
    end

    gradient = { 'type' => type, 'stops' => clean_stops }

    if type == 'linear'
      angle = Integer(raw['angle'].to_s, exception: false)
      return nil unless angle&.between?(0, 360)

      gradient['angle'] = angle
    else
      gradient['shape'] = %w(circle ellipse).include?(raw['shape']) ? raw['shape'] : 'circle'
    end

    gradient
  end

  def colors_valid
    COLOR_ATTRIBUTES.each do |attribute|
      value = self[attribute]
      errors.add(attribute, :invalid) if value.present? && !value.match?(COLOR_PATTERN)
    end
  end

  def gradient_valid
    errors.add(:background_gradient, :invalid) if @gradient_invalid
  end

  def font_weight_supported
    weights = FONTS.dig(font_key, :weights)
    errors.add(:font_weight, :inclusion) unless weights&.include?(font_weight)
  end

  def within_account_limit
    return if account_id.blank?

    errors.add(:base, "카드 스타일은 계정당 최대 #{MAX_PER_ACCOUNT}개까지 만들 수 있습니다.") if CardPreset.where(account_id: account_id).count >= MAX_PER_ACCOUNT
  end
end