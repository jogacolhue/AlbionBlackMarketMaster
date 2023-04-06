import { Component, OnInit } from "@angular/core";
import { ItemClass } from "../item-class";
import { ItemType } from "../item-type";
import { ItemService } from "../item.service";
import { ItemDetailed } from "../item-detailed";
import { Item } from "../item";
import { forkJoin } from "rxjs";
import * as moment from "moment";

@Component({
  selector: "app-item-select",
  templateUrl: "./item-select.component.html",
  styleUrls: ["./item-select.component.css"],
  providers: [ItemService]
})
export class ItemSelectComponent implements OnInit {
  item_types: ItemType[];
  item_class: ItemClass[];
  item_detailed: ItemDetailed[];
  item: Item[];
  itemm: Item[];
  itemmm: Item[];

  selected_items: Array<{ name: string; show: string }> = []; //SelectedItem[];
  quality: string = "1";
  minutes: number = 3;
  tax: number = 3;
  returns: number = 5000;
  usable: boolean = true;

  constructor(private itemService: ItemService) {}

  ngOnInit() {
    this.itemService.getItemType().then((item_types: ItemType[]) => {
      this.item_types = item_types.map(item_type => {
        this.itemService
          .getItemClass(item_type.Type)
          .then((item_class: ItemClass[]) => {
            item_type.Class = item_class.map(item_class => {
              return item_class;
            });
          });

        return item_type;
      });
    });
  }

  itemClick(item_class: ItemClass) {
    if (this.selected_items.length >= 5) {
      alert("You can only pick 5 items at the same time.");
      return;
    }

    for (var i = this.selected_items.length - 1; i >= 0; i--) {
      if (this.selected_items[i].name === item_class.Type) {
        alert("You already picked this item.");
        return;
      }
    }

    var selectedItem = { name: item_class.Type, show: item_class.Name };
    this.selected_items.push(selectedItem);
  }

  removeItem(item_class: any) {
    for (var i = this.selected_items.length - 1; i >= 0; i--) {
      if (this.selected_items[i].name === item_class.name) {
        this.selected_items.splice(i, 1);
      }
    }
  }

  onChangeSelect(value: string) {
    this.quality = value;
  }

  onChangeMinutes(value: number) {
    this.minutes = value;
  }

  onChangeTax(value: number) {
    this.tax = value;
  }

  onChangeReturns(value: number) {
    this.returns = value;
  }

  consultarMaster() { 
    this.usable = false;
    var self = this;

    var promises = [];
    this.selected_items.forEach(function(d) {
      promises.push(self.itemService.getItem(d.name));
    });

    this.itemmm = [];
 
    if(promises.length == 0){
      this.usable = true;
    }

    forkJoin(promises).subscribe(results => {
      results.forEach((element: Item[]) => {
        this.item = element.map(item => {
          return item;
        });

        this.item.forEach(element => {
          this.itemmm.push(element);
        });
      });

      this.itemService
        .blackMarketMaster(this.itemmm, this.quality)
        .then((item_class: Item[]) => {
          this.itemmm = item_class.map(item_class => {
            return item_class;
          });

          this.itemService
            .procesarDatos(this.itemmm, this.minutes, this.tax, this.returns)
            .then((resulllt: Item[]) => {
              this.itemm = resulllt.map(item_class => {
                item_class.Enchantment = item_class.ItemID.split("@")[1];
                item_class.BuyPriceDateString = moment(
                  item_class.BuyPriceDate
                ).format("lll");
                item_class.SellPriceDateString = moment(
                  item_class.SellPriceDate
                ).format("lll");
                return item_class;
              });

              if(this.itemm.length <= 0)
                alert("No deals found.");
            })
            .then(() => {
              this.itemm.forEach(element => {
                this.itemService
                  .getItemDetail(element.ItemID)
                  .then((item_detailed: ItemDetailed[]) => {
                    element.LocalizedNames = item_detailed.map(
                      item_detailed => {
                        return item_detailed.LocalizedNames;
                      }
                    );
                  });
              });
            }).then(()=> this.usable = true);
        });
    });
  }
}
