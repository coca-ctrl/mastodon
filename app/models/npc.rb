# frozen_string_literal: true

class Npc < ApplicationRecord
  belongs_to :account
  has_many :npc_images, dependent: :destroy
  has_many :statuses, dependent: :nullify
  has_many :presets, dependent: :destroy

  validates :name, presence: true, length: { maximum: 30 }

  def image_for(emotion)
    npc_images.find_by(emotion: emotion) || npc_images.find_by(emotion: 'default')
  end
end