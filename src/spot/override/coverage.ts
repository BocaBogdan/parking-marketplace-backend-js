import { OverrideType } from './entities/spot-override.entity.js';

/**
 * SQL for the instants a spot can be booked between `from` and `to`, as a tstzmultirange:
 * its weekly schedule laid over each local day the window touches (so DST is applied per
 * date), plus FREE overrides, minus BUSY ones. Arguments are SQL expressions: the spot's
 * id column, the window's bounds and the time zone.
 */
export function coverageSql(
  spotId: string,
  from: string,
  to: string,
  timeZone: string,
) {
  const overrides = (type: OverrideType) => `coalesce((
    SELECT range_agg(tstzrange(o."startsAt", o."endsAt"))
    FROM spot_override o
    WHERE o."spotId" = ${spotId} AND o.type = '${type}'
  ), '{}'::tstzmultirange)`;

  return `((coalesce((
    SELECT range_agg(tstzrange(
      (d.day + schedule."startMinute" * interval '1 minute') AT TIME ZONE ${timeZone},
      (d.day + schedule."endMinute" * interval '1 minute') AT TIME ZONE ${timeZone}
    ))
    FROM schedule
    CROSS JOIN generate_series(
      date_trunc('day', CAST(${from} AS timestamptz) AT TIME ZONE ${timeZone}),
      CAST(${to} AS timestamptz) AT TIME ZONE ${timeZone},
      interval '1 day'
    ) AS d(day)
    WHERE schedule."spotId" = ${spotId}
      AND schedule."dayOfWeek" = extract(dow FROM d.day)
      AND schedule."startMinute" < schedule."endMinute"
  ), '{}'::tstzmultirange)
  + ${overrides(OverrideType.FREE)})
  - ${overrides(OverrideType.BUSY)})`;
}
