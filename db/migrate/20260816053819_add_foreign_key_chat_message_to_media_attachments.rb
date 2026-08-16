class AddForeignKeyChatMessageToMediaAttachments < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_foreign_key :media_attachments, :chat_messages, validate: false
    validate_foreign_key :media_attachments, :chat_messages
  end
end