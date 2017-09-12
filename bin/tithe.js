#!/usr/bin/env node

"use strict";

// Dependencies
const Tithe = require("../lib")
    , Tilda = require("tilda")
    , Logger = require("bug-killer")
    , Table = require("le-table")
    , FlatColors = require("flatcolors")
    , Couleurs = require("couleurs")()
    , args = process.argv.slice(2)
    , Minimist = require('minimist')(args)
;

/*!
 * log
 *
 * @name log
 * @function
 * @param {Error} err The error.
 * @param {String} data The info message.
 * @return {undefined}
 */
function log(err, data) {
    if (err) {
        return Logger.log(err.stack || err, "error");
    }
    Logger.log(data, "info");
}

// Table defaults
Table.defaults.marks = {
    nw: "┌"
    , n: "─"
    , ne: "┐"
    , e: "│"
    , se: "┘"
    , s: "─"
    , sw: "└"
    , w: "│"
    , b: " "
    , mt: "┬"
    , ml: "├"
    , mr: "┤"
    , mb: "┴"
    , mm: "┼"
};
// Logger configs
Logger.config.displayDate = false;
Logger.config.logLevel = 4;
let tithe = null;

let initTithe = () => tithe = new Tithe(parser.options.P.value);

let parser = new Tilda(`${__dirname}/../package.json`, {
    options: {
        opts: ["a", "all"]
        , desc: "Display all events."
    }
    , examples: [
        "tithe -i -p 100 -d 'Some work for someone'"
        , "tithe -a # displays all the payments"
        , "tithe -i -p 500 -t -d 'GitHub Bounty reward.'"
        , "tithe -c '$' # sets the USD currency"
    ]
    , notes: "«Bring the whole tithe into the storehouse, that there may be food "
    + "in my house. Test me in this,” says the Lord Almighty, “and see if "
    + "I will not throw open the floodgates of heaven and pour out so "
    + "much blessing that there will not be room enough to store it.» "
    + "(Malachi 3:10)"
}).action([
    {
        desc: "Inserts a new event."
        , name: "insert"
        , args: ["description", "brute-income", "date"]
        , options: [
        {
            opts: ["t", "tithe"]
            , desc: "Compute the tenth part of the brute value."
        }
    ]
    }
    , {
        name: "currency"
        , args: ["currency"]
        , desc: "Sets the currency."
    }
    , {
        name: "pay"
        , desc: "Mark everything as paid."
    },
    {
        name: "calculate"
        , desc: "Calculate 10% of the total."
    }
]).globalOption({
    opts: ["P", "tithe-path"]
    , desc: "Use a different tithe json file path."
    , name: "path"
}).on("insert", action => {
    initTithe();

    insertTithe({
        description: action.args.description
        , income: action.args["brute-income"]
        , tithe: action.options.tithe.is_provided
        , date: action.args["date"] || new Date()
        , paid: false
    });
}).on("currency", action => {
    initTithe();
    tithe.setCurrency(action.args.currency, err => log(err, "Currency set succesfully."));
}).on("pay", action => {
    initTithe();
    tithe.pay(err => log(err, "Everything was marked as paid."));
}).on("calculate", action => {
    initTithe();
    tithe.getData({
        paid: false
    }, (err, data) => {
        if (err) {
            return log(err);
        }

        let toPay = (data.total / 10).toFixed(2);
        log(err, `Tithe is ${toPay} ${data.currency}`);
    });
}).main(action => {
    initTithe();

    if (Minimist.p !== undefined && Minimist.d !== undefined) {
        insertTithe({
            description: Minimist.d
            , income: Minimist.p
            , tithe: Minimist.t || false
            , date: Minimist.date || Minimist.D || new Date().toDateString()
            , paid: false
        });

        return;
    }


    // List the events
    tithe.getData({
        paid: action.options.all.is_provided
    }, (err, data) => {
        if (err) {
            return log(err);
        }

        if (!data.events.length) {
            return log(null, "Everything is paid.");
        }

        data.events.sort((a, b) => {
            let x = a.date.getTime();
            let y = b.date.getTime();

            return x < y ? -1 : 1;
        });

        let titheTable = new Table();
        titheTable.addRow(["#", "Date", "Description", "Paid", "Value (" + data.currency + ")"]);
        data.events.forEach(function (c, i) {
            titheTable.addRow([
                i + 1
                , c.date.toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).raw
                , c.desc
                , c.paid ? Couleurs.fg("●", FlatColors(0, 255, 0)) + " Yes"
                    : Couleurs.fg("●", FlatColors(255, 0, 0)) + " No"
                , c.val.toFixed(2)
            ]);
        });

        titheTable.addRow([" ", " ", " ", Couleurs.bold("TOTAL:"), Couleurs.bold([data.total.toFixed(2), data.currency].join(" "))]);
        console.log(titheTable.toString());
    });
});

let insertTithe =
    (input) => {
        let bruteVal = parseFloat(input.income);

        tithe.insert({
            desc: input.description
            , date: input.date
            , paid: input.paid
            , val: bruteVal
            , tithe: input.tithe
        }, err => log(err, "Inserted successfully."));
    };

