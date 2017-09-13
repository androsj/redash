import { values, _ } from 'underscore';
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
      $scope.eventSources = [];

      // This is a hack to force the calendar directive to reload.
      $scope.showCalendar = false;

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

      const BaseColors = {
        Blue: '#4572A7',
        Red: '#AA4643',
        Green: '#89A54E',
        Purple: '#80699B',
        Cyan: '#3D96AE',
        Orange: '#DB843D',
        'Light Blue': '#92A8CD',
        Lilac: '#A47D7C',
        'Light Green': '#B5CA92',
        Brown: '#A52A2A',
        Black: '#000000',
        Gray: '#808080',
        Pink: '#FFC0CB',
        'Dark Blue': '#00008b',
      };

      const ColorPaletteArray = values(BaseColors);

      const refreshData = () => {
        $scope.showCalendar = false;
        const queryData = $scope.queryResult.getData();
        if (queryData) {
          const eventTitleColName = $scope.options.eventTitleColName;
          const startDateColName = $scope.options.startDateColName;
          const endDateColName = $scope.options.endDateColName;

          if (eventTitleColName === null || startDateColName === null || endDateColName === null) {
            return;
          }

          $scope.eventSources.length = 0;
          $scope.showCalendar = true;

          let colorIndex = 0;
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

            const eventSource = {
              events: [
                event,
              ],
              color: ColorPaletteArray[colorIndex],
            };

            colorIndex = colorIndex === ColorPaletteArray.length - 1 ? 0 : colorIndex + 1;
            $scope.eventSources.push(eventSource);
          });
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

    VisualizationProvider.registerVisualization({
      type: 'CALENDAR',
      name: 'Calendar',
      renderTemplate,
      editorTemplate: editTemplate,
    });
  });
}
