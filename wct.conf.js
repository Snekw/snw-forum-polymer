/**
 * Created by Ilkka on 18.4.2016.
 */
var browsers = require('./sauce.browsers');
module.exports = {
  plugins:{
    local:{
      disabled: false,
      browsers: ['firefox']
    },
    sauce:{
      disabled: true,
      browsers: browsers
    }
  }
};