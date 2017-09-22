/* eslint-disable no-use-before-define */
import Map from './map';
import Site from './marker';
import Form from './form';
import { Filter, Filters } from './filter';

const CCMap = CCMap || {};

CCMap.Map = Map;
CCMap.Site = Site;
CCMap.Form = Form;
CCMap.Filter = Filter;
CCMap.Filters = Filters;

export default CCMap;
