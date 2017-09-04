import _ from 'underscore';
import moment from 'moment';
import template from './calendar.html';
import editorTemplate from './calendar-editor.html';

function CalendarRenderer() {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      options: '=?',
    },
    template,
    replace: false,
    controller($scope) {
      $scope.eventSources = [{
        events: [],
      }];

      $scope.uiConfig = {
        calendar: {
          height: 600,
          editable: false,
          header: {
            left: 'title',
            center: '',
            right: 'today prev,next',
          },
        },
      };

      const refreshData = () => {
        const queryData = $scope.queryResult.getData();
        if (queryData) {
          const eventTitleColName = $scope.options.eventTitleColName;
          const startDateColName = $scope.options.startDateColName;
          const endDateColName = $scope.options.endDateColName;
          const newEvents = [];

          if (eventTitleColName === null || startDateColName === null || endDateColName === null) {
            return;
          }

          _.each(queryData, (row) => {
            const title = row[eventTitleColName];
            const start = row[startDateColName];
            const end = row[endDateColName];

            if (title === null || start === null || end === null ||
              !moment.isMoment(start) || !moment.isMoment(end)) return;

            const event = {
              title,
              start: start.format('YYYY-MM-DD'),
              end: end.format('YYYY-MM-DD'),
            };
            newEvents.push(event);
          });

          $scope.eventSources[0].events = newEvents;
        }
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

    // const defaultOptions = {
    //   eventTitleColName: '',
    //   startDateColName: '',
    //   endDateColName: '',
    // };

    VisualizationProvider.registerVisualization({
      type: 'CALENDAR',
      name: 'Calendar',
      renderTemplate,
      editorTemplate: editTemplate,
      // defaultOptions,
    });
  });
}
