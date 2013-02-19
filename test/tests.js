function createTable(dataFunc, cols) {
    var columns = [];
    for (var i = 0; i < cols; i++) {
        columns.push({name : "Column " + i});
    }
    return new ATable({
        fetchData : dataFunc,
        columns : columns,
        el : "#qunit-fixture",
        height : 300
    });
}

var BUFFER_ROWS = 5;

module("Row rendering");
asyncTest("Initial render 100 rows", 4, function () {
    var table = createTable('fetchData100Rows1Col', 1);
    table.render(function () {
        start();
        ok(table.rowHeight > 0, "table.rowHeight should be positive");
        ok(table.visibleRows > 0, "table.visibleRows should be positive");
        equal(table.rows.length, 100, "table.rows should have 100 rows");
        var rows = table.tbodyElt.find("tr");
        equal(rows.length, table.visibleRows + BUFFER_ROWS + 2, "DOM table should have " + (table.visibleRows + BUFFER_ROWS + 2) + " rows");
    });
});

asyncTest("Initial render 10 rows", 4, function () {
    var table = createTable('fetchData10Rows1Col', 1);
    table.render(function () {
        start();
        ok(table.rowHeight > 0, "table.rowHeight should be positive");
        ok(table.visibleRows > 0, "table.visibleRows should be positive");
        equal(table.rows.length, 10, "table.rows should have 10 rows");
        var rows = table.tbodyElt.find("tr");
        var expectedRows = table.visibleRows + BUFFER_ROWS + 2;
        if (expectedRows > 12) expectedRows = 12;
        equal(rows.length, expectedRows, "DOM table should have " + expectedRows + " rows");
    });
});

asyncTest("Initial render 0 rows", 4, function () {
    var table = createTable('fetchData0Rows', 1);
    table.render(function () {
        start();
        ok(table.rowHeight > 0, "table.rowHeight should be positive");
        ok(table.visibleRows > 0, "table.visibleRows should be positive");
        equal(table.rows.length, 0, "table.rows should have 0 rows");
        var rows = table.tbodyElt.find("tr");
        equal(rows.length, 2, "DOM table should have 2 rows");
    });
});

asyncTest("Remove rows", 5, function () {
    var table = createTable('fetchData100Rows1Col', 1);
    table.render(function () {
        start();
        var rows = table.tbodyElt.find("tr");
        equal(rows.length, table.visibleRows + BUFFER_ROWS + 2, "DOM table should have " + (table.visibleRows + BUFFER_ROWS + 2) + " rows");
        table.removeRows(2, true);
        rows = table.tbodyElt.find("tr");
        equal(rows.length, table.visibleRows + BUFFER_ROWS, "DOM table should have " + (table.visibleRows + BUFFER_ROWS) + " rows");
        equal(parseInt(rows[1].cells[0].firstChild.innerHTML), 2, "first cell rendered should contain 2");
        table.removeRows(2, false);
        rows = table.tbodyElt.find("tr");
        equal(rows.length, table.visibleRows + BUFFER_ROWS - 2, "DOM table should have " + (table.visibleRows + BUFFER_ROWS - 2) + " rows");
        var expectedLastVal = rows.length - 1;
        equal(parseInt(rows[table.visibleRows + BUFFER_ROWS - 4].cells[0].firstChild.innerHTML), expectedLastVal, "last cell rendered should contain " + expectedLastVal);
    });
});

asyncTest("Scroll table", 32, function () {
    var table = createTable('fetchData100Rows1Col', 1);
    table.render(function () {
        start();
        // Scroll down, but not enough to render any new rows in the table
        scrollAndTestContents(table, 4);
        // Scroll down enough to render new rows
        scrollAndTestContents(table, 300);
        // Scroll back up some
        scrollAndTestContents(table, 200);
        // Scroll up more
        scrollAndTestContents(table, 100);
        // Scroll up to the top
        scrollAndTestContents(table, 0);
        // Scroll down past the visibleRows + BUFFER_ROWS mark
        scrollAndTestContents(table, table.rowHeight * (table.visibleRows + BUFFER_ROWS) + 50);
        // Scroll to the bottom
        scrollAndTestContents(table, table.rows.length * table.rowHeight);
        // Scroll up a lot
        scrollAndTestContents(table, 100);
    });
});

asyncTest("Random scroll stress test", 4000, function () {
    var table = createTable('fetchData100Rows1Col', 1);
    table.render(function () {
        start();
        var scrollHeight = table.tbodyElt[0].scrollHeight;
        for (var i = 1; i <= 1000; i++) {
            var scrollTop = Math.floor(Math.random() * (scrollHeight + 1));
            table.scrollTable({target : {scrollTop : scrollTop}});
            scrollAndTestContents(table, scrollTop);
        }
    });
});

asyncTest("Random scroll stress test - big table", 4000, function () {
    var table = createTable('fetchData100000Rows1Col', 1);
    table.render(function () {
        start();
        var scrollHeight = table.tbodyElt[0].scrollHeight;
        for (var i = 1; i <= 1000; i++) {
            var scrollTop = Math.floor(Math.random() * (scrollHeight + 1));
            table.scrollTable({target : {scrollTop : scrollTop}});
            scrollAndTestContents(table, scrollTop);
        }
    });
});

function scrollAndTestContents(table, scrollTop) {
    var cols = table.columns.length;
    table.tbodyElt[0].scrollTop = scrollTop;
    table.scrollTable({target : {scrollTop : scrollTop}});
    var rows = table.tbodyElt.find("tr");
    var expectedFirstRow = parseInt(scrollTop / table.rowHeight) - BUFFER_ROWS;
    if (expectedFirstRow < 0) expectedFirstRow = 0;
    var expectedLastRow = expectedFirstRow + table.visibleRows + BUFFER_ROWS;
    if (expectedLastRow > table.rows.length) {
        expectedLastRow = table.rows.length;
        expectedFirstRow = expectedLastRow - table.visibleRows - BUFFER_ROWS;
        if (expectedFirstRow < 0) expectedFirstRow = 0;
    }
    equal(parseInt(rows[1].cells[0].firstChild.innerHTML), expectedFirstRow * cols, "scrollTop = " + scrollTop + ": first cell rendered should contain " + expectedFirstRow * cols);
    equal(parseInt(rows[rows.length - 2].cells[0].firstChild.innerHTML), (expectedLastRow - 1) * cols, "last row's first cell should contain " + (expectedLastRow - 1) * cols);
    equal(table.rowRange.first * table.rowHeight, rows[0].clientHeight, "height of top buffer row should equal " + table.rowRange.first * table.rowHeight);
    equal((table.rows.length - table.rowRange.last) * table.rowHeight, rows[rows.length - 1].clientHeight, "height of bottom buffer row should equal " + (table.rows.length - table.rowRange.last) * table.rowHeight);
}

module("Column Operations");
asyncTest("Reorder columns", 12, function () {
    var table = createTable('fetchData1Row4Cols', 4);
    table.render(function () {
        start();
        var row = table.tbodyElt.find("tr")[1];
        table.moveColumn(0, 1);
        equal(row.cells[0].firstChild.innerHTML, 1, "first cell should contain 1");
        equal(row.cells[1].firstChild.innerHTML, 0, "second cell should contain 0");
        table.moveColumn(1, 0);
        equal(row.cells[0].firstChild.innerHTML, 0, "first cell should contain 0");
        equal(row.cells[1].firstChild.innerHTML, 1, "second cell should contain 1");
        table.moveColumn(0, 3);
        equal(row.cells[0].firstChild.innerHTML, 1, "first cell should contain 1");
        equal(row.cells[1].firstChild.innerHTML, 2, "second cell should contain 2");
        equal(row.cells[2].firstChild.innerHTML, 3, "first cell should contain 3");
        equal(row.cells[3].firstChild.innerHTML, 0, "second cell should contain 0");
        table.moveColumn(2, 0);
        equal(row.cells[0].firstChild.innerHTML, 3, "first cell should contain 3");
        equal(row.cells[1].firstChild.innerHTML, 1, "second cell should contain 1");
        equal(row.cells[2].firstChild.innerHTML, 2, "first cell should contain 2");
        equal(row.cells[3].firstChild.innerHTML, 0, "second cell should contain 0");
    });
});

asyncTest("Resize columns", 12, function () {
    var table = createTable('fetchData1Row4Cols', 4);
    table.render(function () {
        start();
        var row = table.tbodyElt.find("tr")[1];
        var width = table.columns.at(0).get('width');
        var actualWidth = table.columns.at(0).get('element').width();
        equal(width, actualWidth, "stored width and actual width should be equal");
    });
});

asyncTest("Move sorted columns", 12, function () {
    var table = createTable('fetchData1Row4Cols', 4);
    table.render(function () {
        start();
        var row = table.tbodyElt.find("tr")[1];
    });
});