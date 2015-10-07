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
        tags = options[i].split(' ');

        if (tags[1] === '(partition)') {
          partitions.push(tags[0]);
        } else if (tags[1] === '(qos)') {
          qos.push(tags[0]);
        }
      }

      if (partitions.length > 1 || qos.length > 1) {
        return [];
      }

      var index;
      for (index in jobs) {
        if (jobs.hasOwnProperty(index)) {
          if (partitions.length === 1 && qos.length === 1) {
            if (partitions.indexOf(jobs[index].partition) >= 0 && qos.indexOf(jobs[index].qos) >= 0) {
              jobsFiltered[index] = jobs[index];
            }
          } else if (partitions.length === 1 && partitions.indexOf(jobs[index].partition) >= 0) {
            jobsFiltered[index] = jobs[index];
          } else if (qos.length === 1 && qos.indexOf(jobs[index].qos) >= 0) {
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
        try {
          substringRegex = new RegExp('^' + q, 'i');
        } catch (error) {
          return
        }

        $.each(strs, function (i, str) {
          if (substringRegex.test(str)) {
            matches.push(str);
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
