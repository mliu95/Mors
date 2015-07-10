'use strict';
var Util = require('./util.js');

// Constant values for a propensity towards a status
var statusChangePercent = {
  idle: 0.4,
  roam: 0.4,
  chase: 0.8
}

var Infected = function(id, initX, initY) {
  // General descriptive properties
  this.color = '#539328';
  this.height = 30;
  this.id = id;
  this.v = Util.random(1, 6);
  this.width = 30;
  this.x = initX;
  this.y = initY;

  // Radian value of direction this infected is facing
  this.direction = 0;

  // Current state of this infected
  this.status = "idle";

  // Counter, incremented every gameloop this infected is in the same status
  this.statusCounter = 0;

  // The current target this infected is following
  this.target = null;
}

Infected.prototype.getCoordinates = function() {
  return { x: this.x, y: this.y };
}

// Returns the index of the nearest object in arr. Assumes each element in arr has an x and y property
Infected.prototype.getNearest = function(arr) {
  var minDist = Infinity;
  var dist = Infinity;
  var nearest = null;
  var i;

  for (i = arr.length; i--;) {
    dist = Util.calculateDistance(this, arr[i]);
    if (dist < minDist) {
      nearest = i;
      minDist = dist;
    }
  }

  return { distance: minDist, object: arr[nearest] };
}

// Like getNearest but with an array of 5 closest objects in arr
Infected.prototype.getNearestFive = function(arr) {
  var nearest = [];
  var dist = Infinity;
  var index = null;
  var i;
  var n;

  for (i = arr.length; i--;) {
    dist = Util.calculateDistance(this, arr[i]);

    // Add it to nearest and continue loop if nearest isn't full
    if (nearest.length < 5) {
      nearest.push({ distance: dist, object: arr[i] });
    } else {
      for (n = nearest.length; n--;) {
        if (nearest[n].distance < dist) {

          // If the distance is greater than the last element (index is not assigned) we can terminate the loop
          if (index === null) {
            break;
          }
          nearest[index] = { distance: dist, object: arr[i] };
        }
        index = n;
      }
    }
    // Sort the nearest array based on distance at the end of each iteration
    nearest.sort(function(a,b) {
      return b.distance - a.distance;
    });
  }

  return nearest;
}


// Returns all other states than the one passed in
Infected.prototype.getOtherStates = function(state) {
  var keys = Object.keys(statusChangePercent);
  var states = [];
  var s;

  for (s = keys.length; s--;) {
    if (keys[s] != state) {
      states.push(keys[s]);
    }
  }

  return states;
}

Infected.prototype.move = function(v) {
  this.x += v * Math.cos(this.direction);
  this.y += v * Math.sin(this.direction);
}

// Called on each game loop. Go through state of current infected. Determine status changes and new coordinates.
Infected.prototype.think = function(users) {
  var statusChanged = false;

  if (users.length) {

    // Call the status method
    statusChanged = this["think" + this.status](users);

    // If the status has been changed, reset the statusCounter
    if (statusChanged) {
      this.statusCounter = 0; 
    }

    this.statusCounter++;
  }
}

// Think method for chase status
Infected.prototype.thinkchase = function(users) {
  var dist;
  var targets;

  // If this is the first frame in chase, choose a target randomly from the nearest 5 to chase
  if (this.statusCounter === 1 || !this.target) {
    targets = this.getNearestFive(users);
    this.target = targets[Util.randomInt(0, targets.length-1)].object;
  }

  // If the target is too far away, higher chance to lose interest
  dist = Util.calculateDistance(this, this.target)
  if (dist > 300 || (Util.intervalStep(this.statusCounter, 20) && Util.linearChance(dist, Math.random(), 350, .05)) ) {
    this.target = null;
    this.status = "roam";
    return true;
  }

  // If the target is close, we can just jump straight to them.
  if (dist < this.v) {
    this.x = this.target.x;
    this.y = this.target.y;
  } else {
    // Set direction straight to target
    this.direction = Util.calculateAngle(this, this.target);
    this.move(this.v);
  }

  return false;
}

// Think method for idle status
Infected.prototype.thinkidle = function(users) {
  var nearest = this.getNearest(users);

  // The closer the nearest target is, the higher chance of chasing
  if (Util.intervalStep(this.statusCounter, 20) && Util.linearChance(nearest.distance, Math.random(), 200, .85)) {
    this.status = "chase";
    return true;
  }

  // Chance to switch into roam state
  if (Util.intervalStep(this.statusCounter, 50) && Math.random() > 0.8) {
    this.status = "roam";
    return true;
  }

  return false;
}

// Think method for roam status
Infected.prototype.thinkroam = function(users) {
  // Randomly change direction every 50 ticks
  if (Util.intervalStep(this.statusCounter, 50)) {
    this.direction += Math.random(-10, 10);

    // Chance to switch into idle state
    if (Math.random() > 0.8) {
      this.status = "idle";
      return true;
    }
  }
  
  this.move(this.v/4);

  // Other than movement, act the same as an idling infected
  return this.thinkidle(users);
}

Infected.prototype.toJSON = function() {
  return { color: this.color, id: this.id, x: this.x, y: this.y };
}

module.exports = Infected;
