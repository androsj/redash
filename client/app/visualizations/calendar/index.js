import { isUndefined, _ } from 'underscore';
import d3 from 'd3';
import moment from 'moment';
import { getColumnCleanName } from '../../services/query-result';
import template from './calendar.html';
import editorTemplate from './calendar-editor.html';

function CalendarRenderer(clientConfig) {
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

      const eventRender = (event, element) => {
        // create the child scope for the event elements
        if (eventScope === undefined) {
          eventScope = $scope.$new(true);
        }

        const ignoredKeys = ['0', '1', 'allDay', 'className', 'source', 'title', '_id', '$$hashKey', $scope.options.eventConfig.title, $scope.options.eventConfig.start, isUndefined($scope.options.eventConfig.end) ? 'end' : $scope.options.eventConfig.end];

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
      };

      const eventDestroy = () => {
        if (eventScope) {
          eventScope.$destroy();
          eventScope = undefined;
        }
      };

      const updateConfig = () => {
        $scope.uiConfig = {
          calendar: {
            height: 'auto',
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
            views: {
              month: { buttonText: 'Month' },
              basicWeek: { buttonText: 'Week' },
              basicDay: { buttonText: 'Day' },
              agendaWeek: { buttonText: 'Week (Agenda)' },
              agendaDay: { buttonText: 'Day (Agenda)' },
              listYear: { buttonText: 'Year (List)' },
              listMonth: { buttonText: 'Month (List)' },
              listWeek: { buttonText: 'Week (List)' },
              listDay: { buttonText: 'Day (List)' },
            },
          },
        };
      };

      // initialize calendar config
      updateConfig();

      const generateEvents = () => {
        const queryData = $scope.queryResult.getData();
        $scope.calendarEvents.length = 0;

        if (queryData) {
          const eventTitle = $scope.options.eventConfig.title;
          const startDate = $scope.options.eventConfig.start;
          const endDate = $scope.options.eventConfig.end;
          const groupBy = $scope.options.eventConfig.groupBy;
          let groupedEvents;

          if (eventTitle === null || startDate === null) return;

          if (!isUndefined(groupBy)) {
            groupedEvents = _.groupBy(queryData, groupBy);
          } else {
            groupedEvents = { All: queryData };
          }

          const groupNames = _.keys(groupedEvents);
          const options = _.map(groupNames, (group) => {
            if ($scope.options.eventConfig.groups && $scope.options.eventConfig.groups[group]) {
              return $scope.options.eventConfig.groups[group];
            }
            return { color: colorScale(group) };
          });

          $scope.options.eventConfig.groups = _.object(groupNames, options);

          _.each(groupedEvents, (events, type) => {
            const eventGroup = {
              events: [],
              color: $scope.options.eventConfig.groups[type].color,
            };

            _.each(events, (row) => {
              const title = row[eventTitle];
              const start = row[startDate];
              const end = row[endDate];

              if (title === null || start === null) return;

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
      };

      $scope.$on('$destroy', () => {
        if (eventScope) {
          eventScope.$destroy();
          eventScope = undefined;
        }
        $scope.calendarEvents.length = 0;
      });

      $scope.$watch('options.eventConfig', generateEvents, true);
      $scope.$watch('options.calendarConfig', updateConfig, true);
      $scope.$watch('queryResult && queryResult.getData()', generateEvents);
    },
  };
}

function CalendarEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
    link($scope) {
      $scope.currentTab = 'general';
      $scope.columns = $scope.queryResult.getColumns();
      $scope.columnNames = _.pluck($scope.columns, 'name');
      $scope.calendarViews = [
        'month',
        'basicWeek',
        'basicDay',
        'agendaWeek',
        'agendaDay',
        'listYear',
        'listMonth',
        'listWeek',
        'listDay',
      ];
      $scope.weekDays = [
        { name: 'Sunday', value: 0 },
        { name: 'Monday', value: 1 },
        { name: 'Tuesday', value: 2 },
        { name: 'Wednesday', value: 3 },
        { name: 'Thursday', value: 4 },
        { name: 'Friday', value: 5 },
        { name: 'Saturday', value: 6 },
      ];
    },
  };
}

export default function (ngModule) {
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
      eventConfig: {},
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
