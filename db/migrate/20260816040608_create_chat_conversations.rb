class CreateChatConversations < ActiveRecord::Migration[8.1]
  def change
    create_table :chat_conversations do |t|
      t.string :name
      t.boolean :group, default: false, null: false
      t.references :owner, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end