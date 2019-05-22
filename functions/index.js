const functions = require('firebase-functions');
const admin = require('firebase-admin');
const userRouter = require('./express/user-router')
const express = require('express')
const cors = require('cors')

/*
Initializations
*/
const app = express()
app.use(cors())
app.disable('x-powered-by')
app.use(userRouter)

if (!admin.apps.length) {
  admin.initializeApp({});
}


const padToTwo = function (num) {
  if (num <= 9) return '0' + num;
  return num;
}

const updateNextMeasure = function () {
  return admin.database()
    .ref('/tank_measures/measures')
    .orderByKey().
    limitToLast(1)
    .once('value').then((snapshot) => {
      snapshot.forEach((childSnap) => {
        const k = childSnap.key;
        // example 1905021122
        if (k.length !== 10 || isNaN(Number(k))) {
          return;
        }
        // example 2019-05-02T11:22:00Z
        const dateString = '20' + k.substr(0, 2) + '-' + k.substr(2, 2) + '-' + k.substr(4, 2) + 'T' + k.substr(6, 2) + ':' + k.substr(8, 2) + ':00Z';
        var lastDate = new Date(dateString);
        var newDate = new Date(lastDate.setMinutes(lastDate.getMinutes() + 1));
        // eslint-disable-next-line no-implicit-coercion
        const nextMeasureValue = (newDate.getFullYear() % 100) + '' + padToTwo(newDate.getMonth() + 1) + '' + padToTwo(newDate.getDate()) + '' + padToTwo(newDate.getHours()) + '' + padToTwo(newDate.getMinutes());

        admin.database().ref('/tank_measures/next-measure').set(Number(nextMeasureValue));
      });
      return;
    });
}

// Listens for new measures added to /tank_measures/measures/ and update
// next_measure date
exports.updateNextMeasureOnCreate = functions.database.ref('/tank_measures/measures/{pushId}')
  .onCreate((snapshot, context) => {
    return updateNextMeasure();
  });

// Listens for measures deletion from /tank_measures/measures/ and update
// next_measure date
exports.updateNextMeasureOnDelete = functions.database.ref('/tank_measures/measures/{pushId}')
  .onDelete((snapshot, context) => {
    return updateNextMeasure();
  });

exports.users = functions.https.onRequest(app)