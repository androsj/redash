import { isUndefined, _ } from 'underscore';
import d3 from 'd3';
import moment from 'moment';
import { getColumnCleanName } from '../../services/query-result';
import template from './calendar.html';
import editorTemplate from './calendar-editor.html';

function CalendarRenderer(clientConfig, uiCalendarConfig) {
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

      $scope.eventSources = [];
      $scope.options.currentView = $scope.options.currentView || 'month';
      $scope.calendarViews = {
        month: { label: 'Month (Basic)', popoverPlacement: 'auto top-left' },
        basicWeek: { label: 'Week (Basic)', popoverPlacement: 'auto top-left' },
        basicDay: { label: 'Day (Basic)', popoverPlacement: 'auto top-left' },
        agendaWeek: { label: 'Week (Agenda)', popoverPlacement: 'auto left' },
        agendaDay: { label: 'Day (Agenda)', popoverPlacement: 'auto right' },
        listYear: { label: 'Year (List)', popoverPlacement: 'auto top-left' },
        listMonth: { label: 'Month (List)', popoverPlacement: 'auto top-left' },
        listWeek: { label: 'Week (List)', popoverPlacement: 'auto top-left' },
        listDay: { label: 'Day (List)', popoverPlacement: 'auto top-left' },
      };

      const nullToEmptyString = (value) => {
        if (value !== null) {
          return value;
        }
        return '';
      };

      const eventRender = (event, element) => {
        const ignoredKeys = ['0', '1', 'allDay', 'className', 'source', 'title', '_id', '$$hashKey', $scope.options.eventTitle, $scope.options.startDate, isUndefined($scope.options.endDate) ? 'end' : $scope.options.endDate];

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
          'popover-placement': $scope.calendarViews[$scope.options.currentView].popoverPlacement,
          'popover-append-to-body': true,
        });
        $compile(element)($scope);
      };

      const viewRender = (view) => {
        $scope.options.currentView = view.name;
      };

      $scope.uiConfig = {
        calendar: {
          height: 600,
          defaultView: $scope.options.currentView,
          editable: false,
          header: {
            left: 'prev,next today',
            center: 'title',
            right: '',
          },
          navLinks: true,
          themeSystem: 'bootstrap3',
          bootstrapGlyphicons: {
            prev: ' fa fa-chevron-left',
            next: ' fa fa-chevron-right',
          },
          eventRender,
          viewRender,
        },
      };

      const refreshData = () => {
        const queryData = $scope.queryResult.getData();

        if (queryData) {
          const eventTitle = $scope.options.eventTitle;
          const startDate = $scope.options.startDate;
          const endDate = $scope.options.endDate;
          const groupBy = $scope.options.groupBy;

          if (eventTitle === null || startDate === null) return;

          $scope.eventSources.length = 0;
          let groupedEvents;

          if (!isUndefined(groupBy)) {
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

          $scope.options.groups = _.object(groupNames, options);

          _.each(groupedEvents, (events, type) => {
            const eventSource = {
              events: [],
              color: $scope.options.groups[type].color,
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

              eventSource.events.push(event);
            });

            $scope.eventSources.push(eventSource);
          });
        }
      };

      $scope.changeView = (view) => {
        uiCalendarConfig.calendars.theCalendar.fullCalendar('changeView', view);
      };

      $scope.$watch('options', refreshData, true);
      $scope.$watch('queryResult && queryResult.getData()', refreshData);
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
    },
  };
}

export default function (ngModule) {
  ngModule.directive('calendarRenderer', CalendarRenderer);
  ngModule.directive('calendarEditor', CalendarEditor);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate = '<calendar-renderer options="visualization.options" query-result="queryResult"></calendar-renderer>';
    const editTemplate = '<calendar-editor></calendar-editor>';

    VisualizationProvider.registerVisualization({
      type: 'CALENDAR',
      name: 'Calendar',
      renderTemplate,
      editorTemplate: editTemplate,
    });
  });
}
