function newMessage(data) {
  const msg = {
    attachments: {},
    data,
    headers: {},
  };

  return msg;
}

module.exports = {
  newMessage,
};
