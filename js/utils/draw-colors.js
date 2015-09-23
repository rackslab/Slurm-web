define([
  'text!../config/3d.colors.config.json'
], function (colors) {
  colors = JSON.parse(colors);

  return {
    findJobColor: function (jobId) {
      return colors.JOB[(jobId % colors.JOB.length)];
    },
    findLEDColor: function (node) {
      var stateColor = colors.LED.IDLE;
      var nodeColor = colors.LED.UNKNOWN;

      if (node == null) {
        return { node: nodeColor, state: null };
      }

      switch(node.node_state) {
        case 'IDLE':
        case 'IDLE*':
          stateColor = colors.LED.AVAILABLE;
          nodeColor = colors.LED.IDLE;
          break;
        case 'ALLOCATED':
        case 'ALLOCATED*':
        case 'COMPLETING':
        case 'COMPLETING*':
          if (node.total_cpus === -node.cpus) {
            nodeColor = colors.LED.FULLYALLOCATED;
          } else {
            nodeColor = colors.LED.PARTALLOCATED;
          }
          stateColor = colors.LED.AVAILABLE;
          break;
        case 'RESERVED':
          if (node.total_cpus === -node.cpus) {
            nodeColor = colors.LED.FULLYALLOCATED;
          } else {
            nodeColor = colors.LED.PARTALLOCATED;
          }
          stateColor = colors.LED.RESERVED;
          break;
        case 'DRAINING':
        case 'DRAINING*':
        case 'DRAINED':
        case 'DRAINED*':
          stateColor = colors.LED.DRAINED;
          nodeColor = colors.LED.UNAVAILABLE;
          break;
        case 'DOWN':
        case 'DOWN*':
          stateColor = colors.LED.DOWN;
          nodeColor = colors.LED.UNAVAILABLE;
          break;
        default:
          stateColor = colors.LED.NOTVISIBLE;
          nodeColor = colors.LED.UNKNOWN;
      }

      return { node: nodeColor, state: stateColor };
    }
  };
});
