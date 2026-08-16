class AddChatMessageToMediaAttachments < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_reference :media_attachments, :chat_message, null: true, index: { algorithm: :concurrently }
  end
end