import crypto from 'crypto';
import Validator from 'validatorjs';

import db from '../../config/db.config.js';
import { errorResponse, successResponse } from '../../helpers/response.js';

const { sequelize, NewsletterSubscriber } = db;


const generateToken = (length = 48) => {
  return crypto.randomBytes(length).toString('hex');
};

const addSubscribe = async (req, res) => {
  const payload = req.body;
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const validation = new Validator(payload, {
      email: 'required|email',
      name: 'string',
    });

    if (validation.fails()) {
      if (transaction) await transaction.rollback();
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { email, name } = payload;

    const existing = await NewsletterSubscriber.findOne({
      where: { email: email.toLowerCase(), is_deleted: false },
      transaction,
    });

    if (existing) {
      if (!existing.is_subscribed) {
        existing.is_subscribed = true;
        existing.name = name || existing.name;
        existing.unsubscribe_token = generateToken(32);
        await existing.save({ transaction });
        await transaction.commit();
        return successResponse(res, 7101);
      }


      await transaction.rollback();
      return successResponse(res, 7101);

    }

    const token = generateToken(32);

    await NewsletterSubscriber.create({
      email: email.toLowerCase(),
      name,
      is_subscribed: true,
      unsubscribe_token: token,
    }, { transaction });

    await transaction.commit();

    // TODO :: 
    // optionally: send a welcome email including an unsubscribe link:
    // `${process.env.FRONTEND_URL}/unsubscribe?token=${token}`
    return successResponse(res, 7101);

  } catch (error) {
    if (transaction) await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
};


const unsubscribe = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const token = req.query.token || req.body.token;
    let email
    if (req.method === "DELETE" && req.body.email) {
      email = req.body.email;
    }

    let subscriber = null;

    if (token) {
      subscriber = await NewsletterSubscriber.findOne({
        where: {
          unsubscribe_token: token,
          is_deleted: false,
        },
        transaction,
      });

    } else if (email) {
      subscriber = await NewsletterSubscriber.findOne({
        where: { email: email.toLowerCase(), is_deleted: false },
        transaction,
      });
    } else {
      await transaction.rollback();
      return errorResponse(res, 'token or email is required to unsubscribe.');
    }

    if (!subscriber) {
      await transaction.rollback();
      return errorResponse(res, 7106);
    }

    if (!subscriber.is_subscribed) {
      await transaction.rollback();
      return successResponse(res, 7107);
    }

    subscriber.is_subscribed = false;
    subscriber.unsubscribe_token = null;

    await subscriber.save({ transaction });
    await transaction.commit();

    return successResponse(res, 7107);

  } catch (error) {
    if (transaction) await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
};

export default {
  addSubscribe,
  unsubscribe,
};
