class AddBackgroundToStatuses < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_reference :statuses, :background, null: true, foreign_key: false, index: { algorithm: :concurrently }
  end
end