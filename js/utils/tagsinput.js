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
