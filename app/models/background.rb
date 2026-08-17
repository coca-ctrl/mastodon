# frozen_string_literal: true

class Background < ApplicationRecord
  belongs_to :account
  has_many :presets, dependent: :nullify

  has_attached_file :image,
                     styles: {
                       original: '1600x1200>',
                       thumb: '200x150>',
                     },
                     convert_options: { all: '-strip' }

  validates_attachment_content_type :image, content_type: %w(image/jpeg image/png image/webp)
  validates_attachment_size :image, less_than: 8.megabytes
  validates :name, presence: true, length: { maximum: 30 }
  do_not_validate_attachment_file_type :image
end