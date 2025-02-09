import { errors as formidableErrors } from 'formidable';
import {
  sendAcceptedResponse,
  sendOkResponse,
  sendErrorResponse,
  sendResponse,
  sendBadRequestResponse,
  sendNotFoundResponse,
} from '../core/responses.js';
import { uploadMedia } from '../actions/uploadMedia.js';
import { convertBytesToMb } from '../core/utils.js';
import { MAX_FILE_SIZE, CUSTOM_FORMIDABLE_ERRORS } from '../core/constants.js';
import { getMediaUrl } from '../clients/s3.js';
import { createMedia, getMedia } from '../clients/dynamodb.js';
import { getLogger } from '../logger.js';

const logger = getLogger();

export const uploadController = async (req, res) => {
  try {
    const { key, file } = await uploadMedia(req);
    const { size, originalFilename: name, mimetype } = file;

    await createMedia({ key, size, name, mimetype });

    sendAcceptedResponse(res, { fileId: key });
  } catch (error) {
    if (error.httpCode && error.code) {
      if (error.code === formidableErrors.biggerThanTotalMaxFileSize) {
        const maxFileSize = convertBytesToMb(MAX_FILE_SIZE);
        let message = `Failed to upload media. Check the file size. Max size is ${maxFileSize} MB.`;
        sendResponse(res, error.httpCode, message);
        return;
      }

      if (error.code === formidableErrors.maxFilesExceeded) {
        sendBadRequestResponse(res, {
          message:
            'Too many fields in the form. Only single file uploads are supported.',
        });
        return;
      }

      if (error.code === formidableErrors.malformedMultipart) {
        sendBadRequestResponse(res, {
          message: 'Malformed multipart form data.',
        });
        return;
      }

      if (error.code === CUSTOM_FORMIDABLE_ERRORS.INVALID_FILE_TYPE.code) {
        sendResponse(
          res,
          CUSTOM_FORMIDABLE_ERRORS.INVALID_FILE_TYPE.httpCode,
          'Invalid file type. Only images are supported.'
        );
        return;
      }

      sendBadRequestResponse(res);
      return;
    }

    logger.error(error);
    sendErrorResponse(res);
  }
};

export const downloadController = async (req, res) => {
  try {
    const key = req.params.id;

    const media = await getMedia(key);
    if (!media) {
      sendNotFoundResponse(res);
      return;
    }

    const url = await getMediaUrl(key);

    res.redirect(302, url);
  } catch (error) {
    logger.error(error);
    sendErrorResponse(res);
  }
};

export const getController = async (req, res) => {
  try {
    const key = req.params.id;
    const media = await getMedia(key);

    if (!media) {
      sendNotFoundResponse(res);
      return;
    }

    sendOkResponse(res, media);
  } catch (error) {
    logger.error(error);
    sendErrorResponse(res);
  }
};

export const deleteController = async (req, res) => {
  try {
    const key = req.params.id;

    const media = await getMedia(key);
    if (!media) {
      sendNotFoundResponse(res);
      return;
    }

    sendAcceptedResponse(res, { id: 'todo' });
  } catch (error) {
    logger.error(error);
    sendErrorResponse(res);
  }
};
