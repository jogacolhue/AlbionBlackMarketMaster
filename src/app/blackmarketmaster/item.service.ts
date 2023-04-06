import { Injectable } from "@angular/core";
import { ItemType } from "./item-type";
import { ItemClass } from "./item-class";
import { Http, Response } from "@angular/http";
import { Item } from "./item";
import { ItemDetailed } from "./item-detailed";
import * as moment from "moment";
import { forkJoin } from "rxjs"; 

@Injectable({
  providedIn: "root"
})
export class ItemService {
  // private itemTypeUrl = "http://localhost:8080/api/item_type";
  // private itemClassUrl = "http://localhost:8080/api/item_class";
  // private itemDetailedUrl = "http://localhost:8080/api/item";
  // private marketmaster = "http://localhost:8080/api/marketmaster";
  private itemTypeUrl = "/api/item_type";
  private itemClassUrl = "/api/item_class";
  private itemDetailedUrl = "/api/item";
  private marketmaster = "/api/marketmaster";

  constructor(private http: Http) {}

  getItemType(): Promise<void | ItemType[]> {
    return this.http
      .get(this.itemTypeUrl)
      .toPromise()
      .then(response => response.json() as ItemType[])
      .catch(this.handleError);
  }

  getItemClass(itemClass: String): Promise<void | ItemClass[]> {
    return this.http
      .get(this.itemTypeUrl + "/" + itemClass)
      .toPromise()
      .then(response => response.json() as ItemClass[])
      .catch(this.handleError);
  }

  getItem(item: String): Promise<void | Item[]> {
    return this.http
      .get(this.itemClassUrl + "/" + item)
      .toPromise()
      .then(response => response.json() as Item[])
      .catch(this.handleError);
  }

  getItemDetail(item: String): Promise<void | ItemDetailed[]> {
    return this.http
      .get(this.itemDetailedUrl + "/" + item)
      .toPromise()
      .then(response => response.json() as ItemDetailed[])
      .catch(this.handleError);
  }

  sleep(milliseconds : number) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  }

  blackMarketMaster(itemList: Item[], quality: string): Promise<void | Item[]> {
    var promises = [];
    var self = this;

    var NamesGroup = [];
    var names = "";
    var i = 1,
      limit = 0;
    itemList.forEach(element => {
      limit++;
      names = names + element.UniqueName + ",";

      if (i >= 50 || limit == itemList.length) {
        NamesGroup.push(names.slice(0, -1));
        names = "";
        i = 0;
      }

      i++;
    });

    NamesGroup.forEach(function(d) {
      promises.push(
        self.http
          .get(
            "https://www.albion-online-data.com/api/v2/stats/Prices/" +
              d +
              "?locations=Caerleon,BlackMarket&qualities=" +
              quality
          )
          .toPromise()
          .then(response => {
            self.sleep(500);
            return response.json();
          })
      );
    });

    var itemz = [];

    return forkJoin(promises)
      .toPromise()
      .then(results => {
        results.forEach((element: any[]) => {
          var resp = JSON.parse(JSON.stringify(element));

          for (var k in resp) {
            var item = new Item();

            if (
              resp[k]["city"] == "Black Market" &&
              resp[k]["quality"] == quality
            ) {
              item.ItemID = resp[k]["item_id"];
              item.Quality = resp[k]["quality"];
              item.BuyPriceBM = resp[k]["buy_price_max"];
              item.BuyPriceDate = moment(
                resp[k]["buy_price_max_date"],
                "YYYY-MM-DD HH:mm:ss"
              ).toDate();
              item.SellPriceCM = 0;
              item.SellPriceDate = moment(
                "2020-02-01T00:07:00",
                "YYYY-MM-DD HH:mm:ss"
              ).toDate();

              itemz.push(item);
            }
          }

          for (var k in resp) {
            if (resp[k]["city"] == "Caerleon" && item.ItemID != "") {
              itemz.forEach(iit => {
                if (
                  iit.ItemID == resp[k]["item_id"] &&
                  iit.Quality == resp[k]["quality"]
                ) {
                  iit.SellPriceCM = resp[k]["sell_price_min"];
                  iit.SellPriceDate = moment(
                    resp[k]["sell_price_min_date"],
                    "YYYY-MM-DD HH:mm:ss"
                  ).toDate();
                }
              });
            }
          }
        });

        return itemz as Item[];
      })
      .catch(this.handleError);
  }

  procesarDatos(
    newContact: Item[],
    minutes: number,
    tax: number,
    returns: number
  ): Promise<void | Item[]> {
    return this.http
      .post(this.marketmaster, [newContact, minutes, tax, returns])
      .toPromise()
      .then(response => response.json() as Item[])
      .catch(this.handleError);
  }

  private handleError(error: any) {
    let errMsg = error.message
      ? error.message
      : error.status
      ? `${error.status} - ${error.statusText}`
      : "Server error";
    console.error(errMsg); // log to console instead
  }
}
