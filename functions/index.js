const stripeSecretKey =
  'YOUR STRIPE API KEY';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const { getDatabase } = require('firebase-admin/database');

const moment = require('moment-timezone');

const { onCall, onRequest } = require('firebase-functions/v2/https');

const axios = require('axios');

const Stripe = require('stripe');

//const { onRequest } = require('firebase-functions/v2/https');
//const { onCall } = require('firebase-functions/v2/https');

const functions = require('firebase-functions');

const admin = require('firebase-admin');

const { connect } = require('getstream');

const firebaseConfig = {
  databaseURL:
    'YOUR FIREBASE DB URL',
};

const app = initializeApp(firebaseConfig);

const db = getFirestore();

const database = getDatabase(app);

exports.changeMessageStatus = functions.firestore
  .document('rooms/{roomId}/messages/{messageId}')
  .onWrite((change) => {
    const message = change.after.data();
    if (message) {
      if (['delivered', 'seen', 'sent'].includes(message.status)) {
        return null;
      } else {
        return change.after.ref.update({
          status: 'delivered',
        });
      }
    } else {
      return null;
    }
  });

exports.changeLastMessage = functions.firestore
  .document('rooms/{roomId}/messages/{messageId}')
  .onUpdate((change, context) => {
    const message = change.after.data();
    if (message) {
      return db.doc('rooms/' + context.params.roomId).update({
        lastMessages: [message],
      });
    } else {
      return null;
    }
  });

exports.sendFCMNotification = onCall(async (data, context) => {
  console.log('there is a new call');
  const message = {
    message: {
      token: data.data.token,
      data: data.data.data,
      notification: {
        body: data.data.data.body,
        title: data.data.data.title,
      },
      android: { 
        notification: {
          icon: 'notification_icon',
          sound: 'sound.mp3',
          light_settings: {
            color: {
              green: 0.5,
              blue: 0.5,
            },
          },
          notification_priority: 'PRIORITY_HIGH',
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            mutableContent: 1,
            priority: 'high',
          },
        },
        fcm_options: {
          image: data.data.data.image,
        },
      },
    },
  };
  const accessToken = await admin.credential
    .applicationDefault()
    .getAccessToken();

  const fcmSendEndpoint =
    'https://fcm.googleapis.com/v1/projects/buzzmeet-3999d/messages:send';
  try {
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${accessToken.access_token}`);
    headers.append('Content-Type', 'application/json');
    const requestOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
      redirect: 'follow',
    };
    //console.log('we send with the header: ', requestOptions);
    const response = await fetch(fcmSendEndpoint, requestOptions)
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.error(error));
    return { success: true, response: response.data };
  } catch (error) {
    console.error('Error sending FCM message:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send FCM message.'
    );
  }
});


  const headers = {
    Authorization: `Bearer ${accessToken.access_token}`,
    'Content-Type': 'application/json',
  };
  
 await admin
    .messaging()
    .send({
      tokens: data.data.token,
      notification: {
        body: 'This is an FCM notification that displays an image!',
        title: 'FCM Notification',
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
          },
        },
        fcmOptions: {
          imageUrl: 'image-url',
        },
      },
      android: {
        notification: {
          imageUrl: 'image-url',
        },
      },
    })
    .then((response) => {
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });


 const message = {
    message: {
      token: data.data.token,
      data: data.data.data,
      android: {
        notification: {
          image: data.data.image,
          title: data.data.title,
          body: data.data.body,
          icon: 'notification_icon',
          sound: 'sound.mp3',
          light_settings: {
            color: {
              green: 0.5,
              blue: 0.5,
            },
          },
          notification_priority: 'PRIORITY_HIGH',
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            mutableContent: 1,
            category: data.data.category,
            priority: 'high',
          },
        },
        fcm_options: {
          image: data.data.image,
        },
      },
    },
  };
 const accessToken = await admin.credential
    .applicationDefault()
    .getAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken.access_token}`,
    'Content-Type': 'application/json',
  };

  const fcmSendEndpoint =
    'https://fcm.googleapis.com/v1/projects/connect-c0152/messages:send';
  try {
    const response = await axios.post(fcmSendEndpoint, message, { headers });
    return { success: true, response: response.data };
  } catch (error) {
    console.error('Error sending FCM message:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send FCM message.'
    );
  }

exports.streamToken = onRequest(async (req, res) => {
  // Get these values from your GetStream.io Dashboard
  const client = connect(YOUR GET STREAM CREDENTIALS);

  const userId = req.headers.uid;

  // Use the UID as your ID for creating the Stream Token
  const streamToken = client.createUserToken(userId);

  // Return the new Stream Token
  res.json(streamToken);
});

exports.createCustomer = onRequest(async (req, res) => {
  const { name, email } = req.body;
  const stripe = new Stripe(stripeSecretKey);
  const customer = await stripe.customers.create({ name, email });
  res.json({
    customer: customer.id,
  });
});

exports.createPaymentRequests = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    const { amount, currency, customer, products } = req.body;
    const stripe = new Stripe(stripeSecretKey);
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer },
      { apiVersion: '2023-10-16' }
    );
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customer.id,
      payment_method_types: ['card', 'klarna', 'swish', 'paypal'],
      metadata: {
        products,
      },
    });
    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
    });
  } catch (error) {
    console.log('there is an error: ', error);
  }
});

exports.stripeWebhook = onRequest(async (req, res) => {
  console.log('there is a new event');
  const stripe = new Stripe(stripeSecretKey);
  let event;

  try {
    const whSec = 'whsec_AHEd54BqbNSlhiKklQbhCDEG7l2QHsLf';

    event = stripe.webhooks.constructEvent(
      req.rawBody,
      req.headers['stripe-signature'],
      whSec
    );
  } catch (err) {
    console.error('Webhook signature verification failed.');
    return res.sendStatus(400);
  }

  const dataObject = event.data.object;
  const bookingId = dataObject.metadata.products;

  if (bookingId.includes('Credits')) {
  } else {
    await db
      .collection('bookings')
      .doc(bookingId)
      .update({ status: 'confirmed', isPaid: true });
  }

  const t = new Date().getTime();

  await db.doc(`ORDERS/${t}`).set({
    ...dataObject,
  });

  return res.sendStatus(200);
});

exports.checkAndNotifyUpcomingBookings = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = moment();
    const thirtyMinutesFromNow = moment().add(30, 'minutes');

    try {
      const bookingsSnapshot = await db
        .collection('bookings')
        .where('date', '==', now.format('YYYY-MM-DD'))
        .where('status', '==', 'confirmed')
        .get();

      const notificationPromises = [];

      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data();

        const bookingDateTime = moment.tz(
          `${booking.date} ${booking.time}`,
          'YYYY-MM-DD HH:mm',
          booking.timeZone
        );
        const bookingDateTimeUTC = bookingDateTime.clone().tz('UTC');
        const nowUTC = now.clone().tz('UTC');

        if (
          bookingDateTimeUTC.diff(nowUTC, 'minutes') <= 30 &&
          bookingDateTimeUTC.diff(nowUTC, 'minutes') > 25
        ) {
          notificationPromises.push(notifyParticipants(booking));
        }
      });

      await Promise.all(notificationPromises);

      console.log(`Processed ${notificationPromises.length} bookings.`);
      return null;
    } catch (error) {
      console.error('Error processing bookings:', error);
      return null;
    }
  });

const getToken = async (userId) => {
  dbRef.ref(`${userId}/token`).once('value', async (snap) => {
    const token = snap.val();
    await getMessaging()
      .send({
        notification: {
          title: 'New reminder',
          body: 'This is a reminder about your upcoming session on Klotly, make sure to be there on time.',
        },
        token,
      })
      .then((e) => console.log('A notif is successfuly sent'));
  });
};

async function notifyParticipants(booking) {
  const { tutorId, studentId, date, time } = booking;
  studentId.map(async (_) => await getToken(_));
  getToken(tutorId);
}
