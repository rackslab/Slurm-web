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
], function($) {
  function elementSupportAttribute(elm, attr) {
    var test = document.createElement(elm);

    return attr in test;
  }

  return function() {
    if (!elementSupportAttribute('input', 'placeholder')) {
      $('input[placeholder]').each(function() {
        var $fake,
          $input = $(this);

        $input.after('<input id="' + $input.attr('id') + '-fake" style="display:none;" type="text" value="' + $input.attr('placeholder') + '" />');
        $fake = $('#' + $input.attr('id') + '-fake');

        $fake.show().attr('class', $input.attr('class')).attr('style', $input.attr('style'));
        $input.hide();

        $fake.focus(function() {
          $fake.hide();
          $input.show().focus();
        });

        $input.blur(function() {
          if ($input.val() === '') {
            $input.hide();
            $fake.show();
          }
        });
      });
    }
  };
});
