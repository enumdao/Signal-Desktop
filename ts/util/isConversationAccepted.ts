// Copyright 2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import { ConversationAttributesType } from '../model-types.d';
import { isDirectConversation, isMe } from './whatTypeOfConversation';

/**
 * Determine if this conversation should be considered "accepted" in terms
 * of message requests
 */
export function isConversationAccepted(
  conversationAttrs: ConversationAttributesType
): boolean {
  const messageRequestsEnabled = window.Signal.RemoteConfig.isEnabled(
    'desktop.messageRequests'
  );

  if (!messageRequestsEnabled) {
    return true;
  }

  if (isMe(conversationAttrs)) {
    return true;
  }

  const messageRequestEnum =
    window.textsecure.protobuf.SyncMessage.MessageRequestResponse.Type;

  const { messageRequestResponseType } = conversationAttrs;
  if (messageRequestResponseType === messageRequestEnum.ACCEPT) {
    return true;
  }

  const { sentMessageCount } = conversationAttrs;

  const hasSentMessages = sentMessageCount > 0;
  const hasMessagesBeforeMessageRequests =
    (conversationAttrs.messageCountBeforeMessageRequests || 0) > 0;
  const hasNoMessages = (conversationAttrs.messageCount || 0) === 0;

  const isEmptyPrivateConvo =
    hasNoMessages && isDirectConversation(conversationAttrs);
  const isEmptyWhitelistedGroup =
    hasNoMessages &&
    !isDirectConversation(conversationAttrs) &&
    conversationAttrs.profileSharing;

  return (
    isFromOrAddedByTrustedContact(conversationAttrs) ||
    hasSentMessages ||
    hasMessagesBeforeMessageRequests ||
    // an empty group is the scenario where we need to rely on
    // whether the profile has already been shared or not
    isEmptyPrivateConvo ||
    isEmptyWhitelistedGroup
  );
}

// Is this someone who is a contact, or are we sharing our profile with them?
//   Or is the person who added us to this group a contact or are we sharing profile
//   with them?
function isFromOrAddedByTrustedContact(
  conversationAttrs: ConversationAttributesType
): boolean {
  if (isDirectConversation(conversationAttrs)) {
    return Boolean(conversationAttrs.name || conversationAttrs.profileSharing);
  }

  const { addedBy } = conversationAttrs;
  if (!addedBy) {
    return false;
  }

  const conversation = window.ConversationController.get(addedBy);
  if (!conversation) {
    return false;
  }

  return Boolean(
    isMe(conversation.attributes) ||
      conversation.get('name') ||
      conversation.get('profileSharing')
  );
}
