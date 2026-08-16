class AddMessageTypeToChatMessages < ActiveRecord::Migration[8.1]
  def change
    add_column :chat_messages, :message_type, :string, null: false, default: 'user'
    change_column_null :chat_messages, :sender_id, true
  end
end