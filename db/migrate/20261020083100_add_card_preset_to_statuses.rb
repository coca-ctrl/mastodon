class AddCardPresetToStatuses < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_column :statuses, :card_preset_id, :bigint, if_not_exists: true
    add_index :statuses, :card_preset_id,
              algorithm: :concurrently,
              where: 'card_preset_id IS NOT NULL',
              if_not_exists: true
  end
end