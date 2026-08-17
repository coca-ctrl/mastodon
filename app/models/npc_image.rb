# frozen_string_literal: true

class NpcImage < ApplicationRecord
  belongs_to :npc

  has_attached_file :image,
                     styles: {
                       original: '800x1200>',
                       thumb: '200x300>',
                     },
                     convert_options: { all: '-strip' }

  validates_attachment_content_type :image, content_type: %w(image/jpeg image/png image/webp)
  validates_attachment_size :image, less_than: 8.megabytes

  validates :emotion, presence: true, uniqueness: { scope: :npc_id }
  do_not_validate_attachment_file_type :image
end