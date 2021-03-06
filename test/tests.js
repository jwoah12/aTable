var BUFFER_ROWS = 5;
var MIN_COLUMN_WIDTH = 20;

module("Row rendering");
asyncTest("Initial render 100 rows", 4, function () {
    var table = createTable(fetchData100Rows1Col, 1);
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
    var table = createTable(fetchData10Rows1Col, 1);
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
    var table = createTable(function (atable) {
        atable.receivedData([]);
    }, 1);
    table.render(function () {
        start();
        ok(table.rowHeight > 0, "table.rowHeight should be positive");
        ok(table.visibleRows > 0, "table.visibleRows should be positive");
        equal(table.rows.length, 0, "table.rows should have 0 rows");
        var rows = table.tbodyElt.find("tr");
        equal(rows.length, 2, "DOM table should have 2 rows");
    });
});

asyncTest("Render with invisible column", 2, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                [0, 1, 2]
            ]);
        },
        columns : [
            {name : "Column 1", visible : true},
            {name : "Column 2", visible : false},
            {name : "Column 3"}
        ],
        height : 300
    });
    table.render(function () {
        start();
        equal(table.columns.length, 3, "column collection should have 3 models");
        var cols = table.tableElt.find("th");
        equal(cols.length, 2, "there should be 2 rendered columns");
    });
});

asyncTest("Dynamic data source - web worker", function () {
    if (Worker && (typeof Blob == "function" || window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder)) {
        var table = createTable('fetchDataMultipleWorker', 1);
        table.render(function () {
            setTimeout(function () {
                start();
                equal(table.rows.length, 50, "table.rows should have 50 rows");
                var rows = table.tbodyElt.find("tr");
                var expectedRows = table.visibleRows + BUFFER_ROWS + 2;
                equal(rows.length, expectedRows, "DOM table should have " + expectedRows + " rows");
            }, 100);
        });
    }
    else {
        start();
        raises(function () {
            createTable('fetchDataMultipleWorker', 1);
        }, "trying to use web worker without a compatible browser should throw an exception");
    }
});

asyncTest("Dynamic data source - callback function", 2, function () {
    var table = createTable(fetchDataMultiple, 1);
    table.render(function () {
        setTimeout(function () {
            start();
            equal(table.rows.length, 50, "table.rows should have 50 rows");
            var rows = table.tbodyElt.find("tr");
            var expectedRows = table.visibleRows + BUFFER_ROWS + 2;
            equal(rows.length, expectedRows, "DOM table should have " + expectedRows + " rows");
        }, 100);
    });
});

asyncTest("Remove rows", 5, function () {
    var table = createTable(fetchData100Rows1Col, 1);
    table.render(function () {
        start();
        var rows = table.tbodyElt.find("tr");
        equal(rows.length, table.visibleRows + BUFFER_ROWS + 2, "DOM table should have " + (table.visibleRows + BUFFER_ROWS + 2) + " rows");
        table.removeRows(2, true);
        rows = table.tbodyElt.find("tr");
        equal(rows.length, table.visibleRows + BUFFER_ROWS, "DOM table should have " + (table.visibleRows + BUFFER_ROWS) + " rows");
        equal(parseInt(rows[1].cells[0].firstChild.innerHTML, 10), 2, "first cell rendered should contain 2");
        table.removeRows(2, false);
        rows = table.tbodyElt.find("tr");
        equal(rows.length, table.visibleRows + BUFFER_ROWS - 2, "DOM table should have " + (table.visibleRows + BUFFER_ROWS - 2) + " rows");
        var expectedLastVal = rows.length - 1;
        equal(parseInt(rows[table.visibleRows + BUFFER_ROWS - 4].cells[0].firstChild.innerHTML, 10), expectedLastVal, "last cell rendered should contain " + expectedLastVal);
    });
});

asyncTest("Scroll table", 32, function () {
    var table = createTable(fetchData100Rows1Col, 1);
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

asyncTest("Scroll table - dynamic data source", 32, function () {
    var table = createTable(fetchDataMultiple, 1);
    table.render(function () {
        setTimeout(function () {
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
        }, 100);
    });
});

asyncTest("Filter", 10, function () {
    var table = createTable(function (atable) {
        atable.receivedData([
            ["Some text", 1.50],
            ["Some more text", 2.50],
            ["I'm unique", -1.5]
        ]);
    }, 2);
    table.render(function () {
        start();
        equal(table.rows.visibleCount, 3, "rows.visibleCount should be 3");
        table.filter("col1", "e");
        equal(table.rows.length, 3, "Rows collection should have 3 elements");
        equal(table.rows.visibleCount, 3, "rows.visibleCount should be 3");
        var rows = table.tbodyElt.find("tr");
        equal(rows.length, 5, "DOM table should have 3 visible rows plus 2 buffer rows");
        table.filter("col1", "tExT");
        equal(table.rows.visibleCount, 2, "rows.visibleCount should be 2");
        rows = table.tbodyElt.find("tr");
        equal(rows.length, 4, "DOM table should have 2 visible rows plus 2 buffer rows");
        table.filter("col2", 1.5);
        equal(table.rows.visibleCount, 2, "rows.visibleCount should be 2");
        rows = table.tbodyElt.find("tr");
        equal(rows.length, 4, "DOM table should have 2 visible rows plus 2 buffer rows");
        table.filter("col1", "TEXT", true);
        equal(table.rows.visibleCount, 0, "rows.visibleCount should be 0");
        rows = table.tbodyElt.find("tr");
        equal(rows.length, 2, "DOM table should have 0 visible rows plus 2 buffer rows");
    });
});

asyncTest("Edit Data", 1, function () {
    var table = createTable(function (atable) {
        atable.receivedData([
            ["Some text", 1.50],
            ["Some more text", 2.50],
            ["I'm unique", -1.5]
        ]);
    }, 2, true);
    table.render(function () {
        start();
        var rows = table.tbodyElt.find('tr');
        rows[1].firstChild.firstChild.innerHTML = "I changed";
        table.onCellValueChanged({target : rows[1].firstChild.firstChild});
        equal(table.rows.getValue(0, 0), "I changed", "rows[0][0] should be updated to 'I changed'");
    });
});

module("Column Operations");
asyncTest("Reorder columns", 12, function () {
    var table = createTable(fetchData1Row4Cols, 4);
    table.render(function () {
        start();
        table.moveColumn("col1", "col2");
        var row = table.tbodyElt.find("tr")[1];
        equal(row.cells[0].firstChild.innerHTML, 1, "first cell should contain 1");
        equal(row.cells[1].firstChild.innerHTML, 0, "second cell should contain 0");
        table.moveColumn(1, 0);             // Test
        row = table.tbodyElt.find("tr")[1];
        equal(row.cells[0].firstChild.innerHTML, 0, "first cell should contain 0");
        equal(row.cells[1].firstChild.innerHTML, 1, "second cell should contain 1");
        table.moveColumn("col1", "col4");
        row = table.tbodyElt.find("tr")[1];
        equal(row.cells[0].firstChild.innerHTML, 1, "first cell should contain 1");
        equal(row.cells[1].firstChild.innerHTML, 2, "second cell should contain 2");
        equal(row.cells[2].firstChild.innerHTML, 3, "first cell should contain 3");
        equal(row.cells[3].firstChild.innerHTML, 0, "second cell should contain 0");
        table.moveColumn("col3", "col1");
        row = table.tbodyElt.find("tr")[1];
        equal(row.cells[0].firstChild.innerHTML, 1, "first cell should contain 1");
        equal(row.cells[1].firstChild.innerHTML, 3, "second cell should contain 3");
        equal(row.cells[2].firstChild.innerHTML, 0, "first cell should contain 0");
        equal(row.cells[3].firstChild.innerHTML, 2, "second cell should contain 2");
    });
});

asyncTest("Resize columns", 22, function () {
    var table = createTable(fetchData1Row4Cols, 4);
    table.render(function () {
        start();
        resizeColumnAndTest(table, "col1", 5);
        resizeColumnAndTest(table, "col1", -3);
        resizeColumnAndTest(table, "col2", 5);
        resizeColumnAndTest(table, "col4", 5);
        resizeColumnAndTest(table, "col4", -5);
        resizeColumnAndTest(table, "col3", 0);
        resizeColumnAndTest(table, "col1", -100);
        raises(function () {
            table.resizeColumn(5, 0);
        }, "resizing an invalid column index should throw an exception");
    });
});

asyncTest("Sort table", 38, function () {
    var table = createTable(fetchData4Rows4Cols, 4);
    table.render(function () {
        start();
        equal(typeof table.rows.sortColumn, "undefined", "sort column should start undefined");
        ok(!isSorted(table), "table should start unsorted");
        ok(table.tableElt.find(".sortArrow").length === 0, "there should be no sort arrow");

        // Simulate sorting from the UI (no sortDescending parameter)
        table.sort("col1");
        testSort(table, "col1", false);
        table.sort("col1");
        testSort(table, "col1", true);
        table.sort("col1");
        testSort(table, "col1", false);
        table.sort("col4");
        testSort(table, "col4", false);

        // Sort via the API
        table.sort("col3", true);
        testSort(table, "col3", true);
        table.sort("col3", true);
        testSort(table, "col3", true);
        table.sort("col3", false);
        testSort(table, "col3", false);
    });
});

asyncTest("Move sorted columns", 25, function () {
    var table = createTable(fetchData4Rows4Cols, 4);
    table.render(function () {
        start();
        // Move sorted column
        table.sort("col2");
        table.moveColumn("col2", "col1");
        testSort(table, "col2", false);
        // Re-sort a moved sorted column
        table.sort("col2");
        testSort(table, "col2", true);
        // Move sorted column to the end
        table.moveColumn("col2", "col4");
        testSort(table, "col2", true);
        // Move unsorted column to another unsorted column
        table.moveColumn("col1", "col3");
        testSort(table, "col2", true);
        // Move unsorted column to a sorted column
        table.moveColumn("col1", "col4");
        testSort(table, "col2", true);
    });
});

asyncTest("Sort with HTML content", 3, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                ["<a href='google.com'>Google</a>"],
                ["<a href='yahoo.com'>Yahoo!</a>"],
                ["<a id='appleLink' href='apple.com'>Apple</a>"]
            ]);
        },
        columns : [
            {name : "col1"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.render(function () {
        start();
        table.sort("col1");
        var rows = table.tbodyElt.find("tr");
        equal($(rows[1]).find("a")[0].innerHTML, "Apple");
        equal($(rows[2]).find("a")[0].innerHTML, "Google");
        equal($(rows[3]).find("a")[0].innerHTML, "Yahoo!");
    });
});

asyncTest("Show/hide columns", 6, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                [0, 1, 2]
            ]);
        },
        columns : [
            {name : "col1", label : "Column 1", visible : true},
            {name : "col2", label : "Column 2", visible : false},
            {name : "col3", label : "Column 3"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.render(function () {
        start();
        table.showColumn("col2");
        equal(table.columns.length, 3, "column collection should have 3 models");
        var cols = table.tableElt.find("th");
        equal(cols.length, 3, "there should be 3 rendered columns");
        table.hideColumn("col2");
        cols = table.tableElt.find("th");
        equal(cols.length, 2, "there should be 2 rendered columns");
        table.hideColumn("col1");
        cols = table.tableElt.find("th");
        equal(cols.length, 1, "there should be 1 rendered column");
        table.hideColumn("col1");
        cols = table.tableElt.find("th");
        equal(cols.length, 1, "there should be 1 rendered column");
        table.hideColumn("col3");
        cols = table.tableElt.find("th");
        equal(cols.length, 0, "there should be 0 rendered columns");
    });
});

asyncTest("Rename column", 4, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                [0, 1]
            ]);
        },
        columns : [
            {name : "col1", label : "Column 1"},
            {name : "col2", label : "Column 2"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.render(function () {
        start();
        var headers = table.tableElt.find("th");
        equal(headers[0].firstChild.innerHTML, "Column 1", "col1 label should be 'Column 1'");
        equal(headers[1].firstChild.innerHTML, "Column 2", "col2 label should be 'Column 2'");
        table.renameColumn("col1", "New name");
        equal(headers[0].firstChild.innerHTML, "New name", "col1 label should be 'New name'");
        equal(headers[1].firstChild.innerHTML, "Column 2", "col2 label should be 'Column 2'");
    });
});

module("Table options");
asyncTest("Formatter function", 4, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            var date = new Date();
            date.setFullYear(2008, 11, 24);
            var date2 = new Date();
            date2.setFullYear(2009, 4, 15);
            atable.receivedData([
                ["Jessica Student", 3.674, date],
                ["Bill Average", 2.53, date],
                ["Pete Perfect", 4.0, date2]
            ]);
        },
        columns : [
            {name : "name"},
            {name : "gpa"},
            {name : "graddate"}
        ],
        formatter : function (val, row, col, colName) {
            if (colName === "name") {
                var parts = val.split(" ", 2);
                return parts[1] + ", " + parts[0];
            }
            else if (colName === "gpa") {
                return (Math.round(val * 10) / 10).toFixed(1);
            }
            else if (colName === "graddate") {
                return val.toDateString();
            }
            return val;
        },
        el : "#qunit-fixture",
        height : 300
    });

    table.render(function () {
        start();
        var row = table.tbodyElt.find('tr')[1];
        equal(row.cells[0].firstChild.innerHTML, "Student, Jessica", "Format should be 'Last, First'");
        equal(row.cells[1].firstChild.innerHTML, "3.7", "GPA should be rounded to 1 decimal place");
        equal(row.cells[2].firstChild.innerHTML, "Wed Dec 24 2008", "");
        table.sort("gpa", true);
        row = table.tbodyElt.find('tr')[1];
        equal(row.cells[0].firstChild.innerHTML, "Perfect, Pete", "Formatting should be retained after a sort");
    });
});

module("Event callbacks");
asyncTest("Move column", 3, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                [0, 1]
            ]);
        },
        columns : [
            {name : "col1", label : "Column 1"},
            {name : "col2", label : "Column 2"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.on("moveColumn", function (colName, sourceIdx, destIdx) {
        start();
        equal(colName, "col1", "Column name should be col1");
        equal(sourceIdx, 0, "Source index should be 0");
        equal(destIdx, 1, "Destination index should be 1");
    });
    table.render(function () {
        table.moveColumn("col1", "col2");
    });
});

asyncTest("Resize column", 3, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                [0, 1]
            ]);
        },
        columns : [
            {name : "col1", label : "Column 1", width : 100},
            {name : "col2", label : "Column 2"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.on("resizeColumn", function (colName, oldWidth, newWidth) {
        start();
        equal(colName, "col1", "Column name should be col1");
        equal(oldWidth, 100, "Old width should be 100");
        equal(newWidth, 200, "New width should be 200");
    });
    table.render(function () {
        table.resizeColumn("col1", 200);
    });
});

asyncTest("Sort table", 2, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                [0, 1]
            ]);
        },
        columns : [
            {name : "col1", label : "Column 1"},
            {name : "col2", label : "Column 2"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.on("sort", function (sortCol, descending) {
        start();
        equal(sortCol, "col1", "Sort column should be col1");
        equal(descending, true, "Descending should be true");
    });
    table.render(function () {
        table.sort("col1", true);
    });
});

asyncTest("Show/hide column", 2, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                [0, 1]
            ]);
        },
        columns : [
            {name : "col1", label : "Column 1"},
            {name : "col2", label : "Column 2"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.on("hideColumn", function (col) {
        start();
        equal(col, "col1", "Column name should be col1");
    });
    table.on("showColumn", function (col) {
        start();
        equal(col, "col1", "Column name should be col1");
    });
    table.render(function () {
        table.hideColumn("col1");
        table.hideColumn("col1"); // Hiding an invisible column should not fire the event
        table.showColumn("col1");
    });
});

asyncTest("Filter", 3, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                [0, 1]
            ]);
        },
        columns : [
            {name : "col1", label : "Column 1"},
            {name : "col2", label : "Column 2"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.on("filter", function (filterCol, filterStr, caseSensitive) {
        start();
        equal(filterCol, "col1", "Filter column should be col1");
        equal(filterStr, "test", "Filter string should be 'test'");
        ok(caseSensitive, "caseSensitive should be true");
    });
    table.render(function () {
        table.filter("col1", "test", true);
    });
});

asyncTest("Edit cell", 4, function () {
    var table = new ATable({
        dataFunction : function (atable) {
            atable.receivedData([
                ["old value", 1]
            ]);
        },
        columns : [
            {name : "col1", label : "Column 1"},
            {name : "col2", label : "Column 2"}
        ],
        el : "#qunit-fixture",
        height : 300
    });
    table.on("edit", function (row, col, oldVal, newVal) {
        start();
        equal(row, 0, "Edited row should be 0");
        equal(col, 0, "Edited col should be 0");
        equal(oldVal, "old value", "Old value should be 'old value'");
        equal(newVal, "new value", "New value should be 'new value'");
    });
    table.render(function () {
        var row = table.tbodyElt.find("tr")[1];
        row.cells[0].firstChild.innerHTML = "new value";
        table.onCellValueChanged({target : row.cells[0].firstChild});
    });
});

/****************************************************************************************
 * Utility functions
 ****************************************************************************************/

function fetchData4Rows4Cols(atable) {
    var rows = [];
    for (var i = 0; i < 4; i++) {
        rows.push([Math.floor(Math.random() * 100 + 1), Math.floor(Math.random() * 100 + 1), Math.floor(Math.random() * 100 + 1), Math.floor(Math.random() * 100 + 1)]);
    }
    atable.receivedData(rows);
}

function fetchData1Row4Cols(atable) {
    var rows = [];
    for (var i = 0; i < 4; i += 4) {
        rows.push([i, i + 1, i + 2, i + 3]);
    }
    atable.receivedData(rows);
}

function fetchData100Rows1Col(atable) {
    var rows = [];
    for (var i = 0; i < 100; i++) {
        rows.push([i]);
    }
    atable.receivedData(rows);
}

function fetchData10Rows1Col(atable) {
    var rows = [];
    for (var i = 0; i < 10; i++) {
        rows.push([i]);
    }
    atable.receivedData(rows);
}

function fetchDataMultiple(atable) {
    var count = 0;
    var interval = setInterval(function () {
        if (count >= 40) clearInterval(interval);
        var rows = [];
        for (var i = 1; i <= 10; i++, count++) {
            rows.push([count]);
        }
        atable.receivedData(rows, true);
    }, 1);
}

function createTable(dataFunc, cols, editable) {
    var columns = [];
    for (var i = 0; i < cols; i++) {
        columns.push({name : "col" + (i + 1)});
    }
    return new ATable({
        dataFunction : dataFunc,
        columns : columns,
        el : "#qunit-fixture",
        height : 300,
        editable : editable
    });
}

function testSort(table, column, expectDescending) {
    var col = table.columns.get(column);
    ok(isSorted(table), "table should be sorted");
    var arrow = table.tableElt.find(".sortArrow");
    equal(arrow.length, 1, "there should only be one sort arrow");
    equal(arrow[0].parentElement.parentElement.cellIndex, col.get('order'), "sort arrow should be in column " + col.get('order'));

    if (expectDescending) {
        equal(arrow.text().charCodeAt(0), 8595, "sort arrow direction should be down");
        ok(table.rows.sortDescending, "table should be sorted descending");
    }
    else {
        equal(arrow.text().charCodeAt(0), 8593, "sort arrow direction should be up");
        ok(!table.rows.sortDescending, "table should be sorted ascending");
    }
}

function isSorted(table) {
    if (typeof table.rows.sortColumn !== "number") {
        return false;
    }
    var val1, val2;
    // Check that the rows collection is sorted
    for (var i = 0; i < table.rows.length - 1; i++) {
        val1 = table.rows.getValue(i, table.rows.sortColumn);
        val2 = table.rows.getValue(i + 1, table.rows.sortColumn);
        if (table.rows.sortDescending && val1 < val2) return false;
        else if (!table.rows.sortDescending && val1 > val2) return false;
    }
    // Check that the DOM table is sorted
    var rows = table.tbodyElt.find("tr");
    for (var j = 1; j < rows.length - 2; j++) {
        val1 = parseInt(rows[j].cells[table.rows.sortColumn].firstChild.innerHTML, 10);
        val2 = parseInt(rows[j + 1].cells[table.rows.sortColumn].firstChild.innerHTML, 10);
        if (table.rows.sortDescending && val1 < val2) return false;
        else if (!table.rows.sortDescending && val1 > val2) return false;
    }
    return true;
}

function resizeColumnAndTest(table, column, change) {
    var row = table.tbodyElt.find("tr")[1];
    var col = table.columns.get(column);
    var actualWidth = col.get('element').outerWidth();
    var attrWidth = col.get('width');
    var widthDiff = actualWidth - attrWidth;
    var minWidth = MIN_COLUMN_WIDTH;
    var expectedWidth = actualWidth + change;
    if (expectedWidth < minWidth) expectedWidth = minWidth + widthDiff;
    var expectedAttrWidth = attrWidth + change;
    if (expectedAttrWidth < minWidth) expectedAttrWidth = minWidth;
    table.resizeColumn(column, attrWidth + change);
    row = table.tbodyElt.find("tr")[1];
    equal(col.get('element').outerWidth(), expectedWidth, "TH width should change by " + change + "px");
    equal(col.get('width'), expectedAttrWidth, "width attribute should change by " + change + "px");
    var cols = table.tableElt.find("th");
    if (col.get('element').cellIndex === cols.length - 1) {
        equal($(row.cells[col.get('element')[0].cellIndex]).outerWidth(), expectedWidth - table.scrollbarWidth, "TD width should equal TH width - scrollbar width");
    }
    else {
        equal($(row.cells[col.get('element')[0].cellIndex]).outerWidth(), expectedWidth, "TD width should match TH width");
    }
}

function scrollAndTestContents(table, scrollTop) {
    var cols = table.columns.length;
    table.tbodyElt[0].scrollTop = scrollTop;
    table.onTableScrolled({target : {scrollTop : scrollTop}});
    var rows = table.tbodyElt.find("tr");
    var firstVisibleRow = parseInt(scrollTop / table.rowHeight, 10);
    var expectedFirstRow = firstVisibleRow - BUFFER_ROWS;
    if (expectedFirstRow < 0) expectedFirstRow = 0;
    var expectedLastRow = firstVisibleRow + table.visibleRows + BUFFER_ROWS;
    if (expectedLastRow > table.rows.length) {
        expectedLastRow = table.rows.length;
        expectedFirstRow = expectedLastRow - table.visibleRows - BUFFER_ROWS;
        if (expectedFirstRow < 0) expectedFirstRow = 0;
    }
    equal(parseInt(rows[1].cells[0].firstChild.innerHTML, 10), expectedFirstRow * cols, "scrollTop = " + scrollTop + ": first cell rendered should contain " + expectedFirstRow * cols);
    equal(parseInt(rows[rows.length - 2].cells[0].firstChild.innerHTML, 10), (expectedLastRow - 1) * cols, "last row's first cell should contain " + (expectedLastRow - 1) * cols);
    equal(table.rowRange.first * table.rowHeight, rows[0].clientHeight, "height of top buffer row should equal " + table.rowRange.first * table.rowHeight);
    equal((table.rows.length - table.rowRange.last) * table.rowHeight, rows[rows.length - 1].clientHeight, "height of bottom buffer row should equal " + (table.rows.length - table.rowRange.last) * table.rowHeight);
}