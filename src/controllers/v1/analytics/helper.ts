export function createDateRangeArray(firstDate = '2022-01-01', endDate = '2022-01-01') {
    const dateArray: any[] = [];
    let currentDate = new Date(firstDate);
    let stopDate = new Date(endDate);
    while (currentDate <= stopDate) {
        dateArray.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
}