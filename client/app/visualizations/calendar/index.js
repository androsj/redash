import { isUndefined, values, _ } from 'underscore';
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
    controller($scope, uiCalendarConfig) {
      $scope.eventSources = [];

      // This is a hack to force the calendar directive to reload.
      $scope.showCalendar = false;

      $scope.uiConfig = {
        calendar: {
          height: 600,
          editable: false,
          header: {
            left: 'today prev,next',
            center: 'title',
            right: '',
          },
          themeSystem: 'bootstrap3',
          bootstrapGlyphicons: {
            prev: ' fa fa-chevron-left',
            next: ' fa fa-chevron-right',
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
          const eventTitle = $scope.options.eventTitle;
          const startDate = $scope.options.startDate;
          const endDate = $scope.options.endDate;
          const groupBy = $scope.options.groupBy;

          if (eventTitle === null || startDate === null || endDate === null) {
            return;
          }

          $scope.eventSources.length = 0;
          $scope.showCalendar = true;
          let groupedEvents = [];

          if (!isUndefined(groupBy)) {
            groupedEvents = _.groupBy(queryData, groupBy);
          } else {
            groupedEvents[0] = queryData;
          }

          let colorIndex = 0;
          _.each(groupedEvents, (type) => {
            const eventSource = {
              events: [],
              color: ColorPaletteArray[colorIndex],
            };

            _.each(type, (row) => {
              const title = row[eventTitle];
              const start = row[startDate];
              const end = row[endDate];

              if (title === null || start === null || end === null ||
                !moment.isMoment(start) || !moment.isMoment(end)) return;

              const event = {
                title,
                start: start.format('YYYY-MM-DD'),
                end: end.format('YYYY-MM-DD'),
              };

              eventSource.events.push(event);
            });

            colorIndex = colorIndex === ColorPaletteArray.length - 1 ? 0 : colorIndex + 1;
            $scope.eventSources.push(eventSource);
          });
        }
      };

      $scope.changeView = (view, calendar) => {
        uiCalendarConfig.calendars[calendar].fullCalendar('changeView', view);
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
