/*
 * Copyright (C) 2015 EDF SA
 *
 * This file is part of slurm-web.
 *
 * slurm-web is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * slurm-web is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with slurm-web.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

define([
  'jquery',
  'date-utils'
], function ($, dateUtils) {
  return {
    filterJobs: function (jobs, options) {
      var jobsFiltered = {};
      var partitions = [];
      var qoss = [];
      var users = [];
      var reservations = [];
      var states = [];
      var startTimes = [];
      var endTimes = [];

      if (!options.length) {
        return jobs;
      }

      var i;
      var tags;
      var lastTagCount;
      for (i = 0; i < options.length; i++) {
        tags = options[i].split(' ');
        lastTagCount = tags.length - 1;

        if (tags[lastTagCount] === '(partition)') {
          partitions.push(tags[0]);
        } else if (tags[lastTagCount] === '(qos)') {
          qoss.push(tags[0]);
        } else if (tags[lastTagCount] === '(user)') {
          users.push(tags[0] + ' ' + tags[1]);
        } else if (tags[lastTagCount] === '(state)') {
          states.push(tags[0]);
        } else if (tags[lastTagCount] === '(reservation)') {
          reservations.push(tags[0]);
        } else if (tags[lastTagCount] === '(start-time)') {
          startTimes.push({ checker: tags[1], timestamp: dateUtils.dateTagToTimestamp(tags[2]) });
        } else if (tags[lastTagCount] === '(end-time)') {
          endTimes.push({ checker: tags[1], timestamp: dateUtils.dateTagToTimestamp(tags[2]) });
        }
      }

      if (partitions.length > 1 ||
          qoss.length > 1 ||
          users.length > 1 ||
          states.length > 1 ||
          reservations.length > 1 ||
          startTimes.length > 1 ||
          endTimes.length > 1) {
        return [];
      }

      var arrayJobs = Object.keys(jobs).map(function (key) {
        jobs[key].key = key;
        return jobs[key]
      });

      var filter = {
        qos: qoss[0] || null,
        partition: partitions[0] || null,
        username: users[0] || null,
        job_state: states[0] || null,
        resv_name: reservations[0] || null,
        start_time: startTimes[0] || null,
        end_time: endTimes[0] || null
      };

      jobsFiltered = arrayJobs.filter(function(item) {
        for (var key in filter) {
          if (filter[key] !== null &&
              item[key] &&
              filter[key].checker === '<' &&
              item[key] > filter[key].timestamp
            ) {
            return false;
          } else if (filter[key] !== null &&
              item[key] &&
              filter[key].checker === '>' &&
              item[key] < filter[key].timestamp
            ) {
            return false;
          }
        }

        return true;
      });

      jobsFiltered = jobsFiltered.filter(function (item) {
        for (var key in filter) {
          if (key !== 'start_time' && key !== 'end_time' && filter[key] !== null && item[key] != filter[key]) {
            return false;
          }
        }

        return true;
      });

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

        startTimeRegex = new RegExp('^(start) (<|>) ', 'i');
        if (startTimeRegex.test(q)) {
          if (q.length <= 8) {
            q += 'now';
          }

          if (q.search('(start-time)') === -1) {
            q += ' (start-time)';
          }

          matches.push(q);
        }

        endTimeRegex = new RegExp('^(end) (<|>) ', 'i');
        if (endTimeRegex.test(q)) {
          if (q.length <= 6) {
            q += 'now';
          }

          if (q.search('(end-time)') === -1) {
            q += ' (end-time)';
          }

          matches.push(q);
        }

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
