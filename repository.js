'use strict';

// bring in firestore
const Firestore = require("@google-cloud/firestore");

// configure with current project
const db = new Firestore(
    {
        projectId: process.env.GOOGLE_CLOUD_PROJECT
    }
);

// mock events data - for a real solution this data should be coming 
// from a cloud data store
const mockEvents = {
    events: [
        { title: 'a mock event', id: 1, description: 'something really cool', location: 'Joes pizza', likes: 0 },
        { title: 'another mock event', id: 2, description: 'something even cooler', location: 'Johns pizza', likes: 0 }
    ]
};


// responsible for retrieving events from firestore and adding 
// firestore's generated id to the returned object
async function getEvents(firestore = db) {
  return firestore.collection("Events").get()
        .then((snapshot) => {
            if (!snapshot.empty) {
                const ret = { events: [] };
                snapshot.docs.forEach(element => {
                    //get data
                    const el = element.data();
                    //get internal firestore id
                    el._id = element.id;
                    //add object to array
                    ret.events.push(el);
                }, this);
                return ret;
            } 
            // if no data has yet been added to firestore, return mock data
            return mockEvents;
        })
        .catch((err) => {
            console.error('Error getting events', err);
            return mockEvents;
        });
};


// This has been modified to insert into firestore, and then call 
// the shared getEvents method.
async function addEvent(req, firestore = db) {
    // create a new object from the json data. The id property
    // has been removed because it is no longer required.
    // Firestore generates its own unique ids
    const ev = {
        title: req.body.title,
        description: req.body.description,
        location: req.body.location,
        likes: 0
    }
    return firestore.collection("Events").add(ev).then(ret => {
        // return events using shared method that adds __id
        return getEvents(firestore);
    });
};


// function used by both like and unlike. If increment = true, a like is added.
// If increment is false, a like is removed.
async function changeLikes(id, increment, firestore) {
    // return the existing objct
   return firestore.collection("Events").doc(id).get()
        .then((snapshot) => {
            const el = snapshot.data();
            // if you have elements in firestore with no likes property
            if (!el.likes) {
                el.likes = 0;
            }
            // increment the likes
            if (increment) {
                el.likes++;
            }
            else if(el.likes > 0) {
                el.likes--;
            }
            // do the update
            return firestore.collection("Events")
                .doc(id).update(el).then((ret) => {
                    // return events using shared method that adds __id
                    return getEvents(firestore);
                });
        })
        .catch(err => { console.log(err) });
}

async function addLike(id, firestore = db) {
    console.log("adding like to = " + id);
    return changeLikes(id, true, firestore);
};

async function removeLike(id, firestore = db) {
    console.log("removing like from = " + id);
    return changeLikes(id, false, firestore);
};


const eventRepository = function () {

    return {
        getEvents: getEvents,
        addEvent: addEvent,
        addLike: addLike,
        removeLike: removeLike
    };
}();

module.exports = eventRepository;