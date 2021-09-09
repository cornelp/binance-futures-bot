getCurrentCandleData(field = null)
    - gets the candle info when the field is null
    - when a field is given, it maps over the candle data, fetching only that prop

getCandleData(index, prop = null, defaultValue = 0)
    - returns specified index from the candle data
    - index can be negative
    - if a prop is given, it maps over the result, fetching only that prop
    - if the asked index is null, a defaultValue will be returned
