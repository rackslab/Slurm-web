define([
  'text!../config/3d.colors.config.json'
], function (colors) {
  colors = JSON.parse(colors);

  return {
    findJobColor: function (jobId) {
      return colors.JOB[(jobId % colors.JOB.length)];
    },
    findLEDColor: function (node) {
      var color;

      switch(node.node_state) {
        case 'IDLE':
        case 'IDLE*':
          color = colors.LED.IDLE;
          break;
        case 'ALLOCATED':
        case 'ALLOCATED*':
        case 'COMPLETING':
        case 'RESERVED':
        case 'COMPLETING*':
          if (node.total_cpus === -node.cpus) {
            color = colors.LED.FULLYALLOCATED;
            break;
          }
          color = colors.LED.PARTALLOCATED;
          break;
        case 'DRAINING':
        case 'DRAINING*':
        case 'DRAINED':
        case 'DRAINED*':
        case 'DOWN':
        case 'DOWN*':
          color = colors.LED.UNAVAILABLE;
          break;
        default:
          color = colors.LED.UNKNOWN;
      }

      return color;
    }
  };
});
