define([
  'jquery'
], function ($) {
  return {
    filterJobs: function (jobs, options) {
      var jobsFiltered = {};
      var partitions = [];
      var qos = [];

      if (!options.length) {
        return jobs;
      }

      var i;
      var tags;
      for (i = 0; i < options.length; i++) {
        tags = options[i].split('-');

        if (tags[0] === 'partition') {
          partitions.push(tags[1]);
        } else if (tags[0] === 'qos') {
          qos.push(tags[1]);
        }
      }

      var index;
      for (index in jobs) {
        if (jobs.hasOwnProperty(index)) {
          if (partitions.indexOf(jobs[index].partition) === -1 && qos.indexOf(jobs[index].qos) === -1) {
            jobsFiltered[index] = jobs[index];
          }
        }
      }

      return jobsFiltered;
    },
    jobsSubstringMatcher: function (strs) {
      return function findMatches(q, cb) {
        var matches;
        var substringRegex;
        matches = [];
        substringRegex = new RegExp('^' + q, 'i');

        $.each(strs, function (i, str) {
          if (substringRegex.test(str.text)) {
            matches.push(str.text);
          }
        });

        cb(matches);
      };
    },
    getTagsinputOptions: function (selector) {
      if (!$(selector).length) {
        return [];
      }

      return $(selector).tagsinput('items');
    }
  };
});
