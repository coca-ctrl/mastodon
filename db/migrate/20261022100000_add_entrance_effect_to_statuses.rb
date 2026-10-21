# frozen_string_literal: true

class AddEntranceEffectToStatuses < ActiveRecord::Migration[8.1]
  def change
    add_column :statuses, :entrance_effect, :string
  end
end
