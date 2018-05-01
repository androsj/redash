import d3 from 'd3';
import moment from 'moment';
import { isUndefined, _ } from 'underscore';
import { isNullOrUndefined } from 'util';
import { getColumnCleanName } from '@/services/query-result';
import template from './calendar.html';
import editorTemplate from './calendar-editor.html';

function CalendarRenderer(clientConfig, uiCalendarOptions) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      options: '=?',
    },
    template,
    replace: false,
    controller($compile, $scope) {
      const colorScale = d3.scale.category10();
      $scope.calendarEvents = [];

      // Compile events with popover attributes into this child scope so we can destroy them later.
      let eventScope;

      const nullToEmptyString = (value) => {
        if (value !== null) {
          return value;
        }
        return '';
      };

      function eventRender(event, element) {
        // create the child scope for the event elements
        if (eventScope === undefined) {
          eventScope = $scope.$new(true);
        }

        const ignoredKeys = ['0', '1', 'allDay', 'className', 'source', 'title', '_id', '$$hashKey', $scope.options.title, $scope.options.start, isUndefined($scope.options.end) ? 'end' : $scope.options.end];

        // Build template
        let popoverTemplate = "'<ul>";
        _.each(event, (value, key) => {
          if (!ignoredKeys.includes(key)) {
            key = getColumnCleanName(key);

            popoverTemplate += `<li><strong>${key}:</strong>
            ${moment.isMoment(value) ? value.format(clientConfig.dateTimeFormat) : nullToEmptyString(value)}</li>`;
          }
        });
        popoverTemplate += "</ul>'";

        element.attr({
          'uib-popover-html': popoverTemplate,
          'popover-title': event.title,
          'popover-trigger': "'outsideClick'",
          'popover-placement': 'auto top-left',
          'popover-append-to-body': true,
        });

        let newElement = $compile(element)(eventScope);

        eventScope.$on('$destroy', () => {
          newElement.remove();
          newElement = undefined;
        });
      }

      function eventDestroy() {
        if (eventScope) {
          eventScope.$destroy();
          eventScope = undefined;
        }
      }

      function updateConfig() {
        $scope.uiConfig = {
          calendar: {
            // height: 'parent',
            aspectRatio: 2.0,
            fixedWeekCount: false,
            defaultView: $scope.options.calendarConfig.views[0] || 'month',
            editable: false,
            eventLimit: $scope.options.calendarConfig.eventLimit,
            firstDay: $scope.options.calendarConfig.firstDay,
            header: {
              left: 'prev,next today',
              center: 'title',
              right: $scope.options.calendarConfig.views.join(),
            },
            navLinks: true,
            weekends: $scope.options.calendarConfig.weekends,
            weekNumbers: $scope.options.calendarConfig.weekNumbers,
            themeSystem: 'bootstrap3',
            bootstrapGlyphicons: {
              prev: ' fa fa-chevron-left',
              next: ' fa fa-chevron-right',
            },
            ...$scope.options.calendarConfig.showPopover && { eventRender },
            ...$scope.options.calendarConfig.showPopover && { eventDestroy },
            views: uiCalendarOptions.views,
          },
        };
      }

      // initialize calendar config
      updateConfig();

      function generateEvents() {
        const queryData = $scope.queryResult.getData();
        $scope.calendarEvents.length = 0;

        if (queryData) {
          const eventTitle = $scope.options.title;
          const startDate = $scope.options.start;
          const endDate = $scope.options.end;
          const groupBy = $scope.options.groupBy;
          let groupedEvents;

          // Required fields
          if (isNullOrUndefined($scope.options.title) || isNullOrUndefined($scope.options.start)) return;

          // Group events
          if (!isNullOrUndefined(groupBy)) {
            groupedEvents = _.groupBy(queryData, groupBy);
          } else {
            groupedEvents = { All: queryData };
          }

          const groupNames = _.keys(groupedEvents);
          const options = _.map(groupNames, (group) => {
            if ($scope.options.groups && $scope.options.groups[group]) {
              return $scope.options.groups[group];
            }
            return { color: colorScale(group) };
          });

          // Groups' colors
          $scope.options.groups = _.object(groupNames, options);

          _.each(groupedEvents, (events, type) => {
            const eventGroup = {
              events: [],
              color: $scope.options.groups[type].color,
            };

            _.each(events, (row) => {
              const title = row[eventTitle];
              const start = row[startDate];
              const end = row[endDate];

              // Skip rows where title is not a string, or start is not a date, or ...
              if (!_.isString(title) || !moment.isMoment(start) ||
                // End is mapped, allow nulls, but must be a date if defined
                (!isNullOrUndefined($scope.options.end) && end !== null && !moment.isMoment(end))) {
                return;
              }

              const event = {
                title,
                start,
                ...endDate && { end },
                ...row,
              };

              eventGroup.events.push(event);
            });

            $scope.calendarEvents.push(eventGroup);
          });
        }
      }

      $scope.$on('$destroy', () => {
        if (eventScope) {
          eventScope.$destroy();
          eventScope = undefined;
        }
        $scope.calendarEvents.length = 0;
      });

      const rendererTriggers = ['options.title', 'options.start', 'options.end', 'options.groupBy', 'queryResult && queryResult.getData()'];

      $scope.$watchGroup(rendererTriggers, generateEvents);
      $scope.$watch('options.groups', generateEvents, true);

      $scope.$watch('options.calendarConfig', updateConfig, true);
    },
  };
}

function CalendarEditor(uiCalendarOptions) {
  return {
    restrict: 'E',
    template: editorTemplate,
    link($scope) {
      $scope.currentTab = 'general';
      $scope.columns = $scope.queryResult.getColumns();
      $scope.columnNames = _.pluck($scope.columns, 'name');
      $scope.calendarViews = uiCalendarOptions.calendarViews;
      $scope.weekDays = uiCalendarOptions.weekDays;
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('calendarRenderer', CalendarRenderer);
  ngModule.directive('calendarEditor', CalendarEditor);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate = '<calendar-renderer options="visualization.options" query-result="queryResult"></calendar-renderer>';
    const editTemplate = '<calendar-editor></calendar-editor>';

    const defaultOptions = {
      calendarConfig: {
        eventLimit: false,
        firstDay: 0,
        showPopover: true,
        weekends: true,
        weekNumbers: false,
        views: [
          'month',
          'agendaWeek',
          'agendaDay',
          'listWeek',
        ],
      },
    };

    VisualizationProvider.registerVisualization({
      type: 'CALENDAR',
      name: 'Calendar',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
