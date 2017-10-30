import { isUndefined, values, _ } from 'underscore';
import moment from 'moment';
import { getColumnCleanName } from '../../services/query-result';
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
    controller($compile, $scope, clientConfig, uiCalendarConfig) {
      $scope.eventSources = [];

      // This is a hack to force the calendar directive to reload.
      $scope.showCalendar = false;

      const nullToEmptyString = (value) => {
        if (value !== null) {
          return value;
        }
        return '';
      };

      const eventRender = (event, element) => {
        const ignoredKeys = ['0', '1', 'allDay', 'className', 'source', 'title', '_id', '$$hashKey', $scope.options.eventTitle, $scope.options.startDate, $scope.options.endDate];

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
          'popover-trigger': "'mouseenter'",
        });
        $compile(element)($scope);
      };

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
          eventRender,
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

          if (eventTitle === null || startDate === null) return;

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

              if (title === null || start === null) return;

              const event = {
                title,
                start,
                end,
                ...row,
              };

              eventSource.events.push(event);
            });

            colorIndex = colorIndex === ColorPaletteArray.length - 1 ? 0 : colorIndex + 1;
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
