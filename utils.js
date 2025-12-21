import fs from "fs/promises";

export const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

export const buildErrorResponse = async ({
  text,
  audioFile,
  facialExpression = "sad",
  animation = "Talking_1",
  error,
}) => {
  const audio = audioFile ? await audioFileToBase64(audioFile) : null;

  return {
    text,
    facialExpression,
    animation,
    audio,
    error,
  };
};
