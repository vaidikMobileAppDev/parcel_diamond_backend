import nodemailer from 'nodemailer';
import config from '../config/config.js';

export default async (email, subject, messageHTML) => {
  try {
    const transpot = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.username,
        pass: config.email.password,
      },
    });

    const mailOption = {
      from: config.email.from,
      to: email,
      subject: subject,
      text: messageHTML,
    };

    await transpot.sendMail(mailOption);
  } catch (error) {
    console.log('mail error : ', error);
    throw error;
  }
};
