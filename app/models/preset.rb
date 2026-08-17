# frozen_string_literal: true

class Preset < ApplicationRecord
  belongs_to :account
  belongs_to :npc
  belongs_to :background, optional: true

  validates :name, presence: true, length: { maximum: 30 }
  validates :npc_emotion, presence: true
end