class AddNpcToStatuses < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_reference :statuses, :npc, null: true, foreign_key: false, index: { algorithm: :concurrently }
    add_column :statuses, :npc_emotion, :string, null: true
  end
end