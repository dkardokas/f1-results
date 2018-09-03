import * as React from "react";
import styles from "./F1Results.module.scss";
import { IF1ResultsProps } from "./IF1ResultsProps";
import { ListService } from "../common/services/ListService";

export default class F1Results extends React.Component<IF1ResultsProps, any> {
  private LIST_TITLE_RACES: string = "F1_Races";
  private LIST_TITLE_ENTRIES: string = "F1_Entries";

  private _listService: ListService;
  private _webUrl: string;


  constructor(props:any) {
    super(props);
    this._listService = new ListService(this.props.context.spHttpClient);
    this._webUrl = this.props.context.pageContext.web.absoluteUrl;
    this.state = {
      completedRaces: [],
      allEntries: []
    };


  }
  public render(): React.ReactElement<IF1ResultsProps> {

    return (
      <div className={styles.f1Results}>
        <div className={styles.container}>
          <div id="results" className={styles.csstransforms}>
            <table className={styles["table-header-rotated"]}>
              <tr><th></th>
                {this.state.completedRaces.map((element) => (
                  <th className={styles.rotate}><div><span>{element.title}</span></div></th>
                ))}
                <th className={styles.rotate}><div><span>Total</span></div></th>
                <th className={styles.rotate}><div><span>Best {this.state.bestOf}</span></div></th>
              </tr>
              {this.state.allEntries.map((userEntry) => (
                <tr>
                  <td>{userEntry.displayName}</td>
                  {this.state.completedRaces.map((race) => (
                    <td>
                      {
                        this.getUserPointsForRace(userEntry, race)
                      }
                    </td>
                  ))}                  
                  <td>{userEntry.points_allRaces}</td>
                  <td>{userEntry.topEntries}</td>
                </tr>
              ))}
            </table>
          </div>
        </div>
      </div>
    );
  }
  private getUserPointsForRace(userEntry: any, race: any):JSX.Element {
    var raceEntry:any = userEntry.raceEntries.filter(raceEntry => raceEntry.raceId === race.id)[0];
    if(!raceEntry) {
      return null;
    }
    const resultStyle:React.CSSProperties = {
      fontWeight: "bold"
    } as React.CSSProperties;

  return (<p style={raceEntry.isTopPoints ? resultStyle : null}>{raceEntry.points_total}</p>);
  }

  public componentDidMount():void {
    this._getCompletedRaces().then(() => {
      this._getCompletedEntries();
    });
  }

  private _getTopXPoints(userEntry:any, x:number):number {
    userEntry.raceEntries.sort(function (a:any, b:any):number {
      return b.points_total - a.points_total;
    });
    let bestPoints:number = 0;
    for (let i: number = 0; i < x && userEntry.raceEntries[i]; i++) {
      bestPoints += userEntry.raceEntries[i].points_total;
      userEntry.raceEntries[i].isTopPoints = true;
    }

    return bestPoints;
  }


  private _getCompletedRaces(): Promise<any> {
    let q: string = `<View><Query><Where><Eq><FieldRef Name='Points_Allocated' />
    <Value Type='Boolean'>1</Value></Eq></Where></Query></View>`;

    var races:any[] = [];
    return new Promise<any>((resolve) => {
      this._listService.getListItemsByQuery(this._webUrl, this.LIST_TITLE_RACES, q).then(racesFromSP => {
        racesFromSP.value.forEach(raceFromSP => {
          races.push({
            id: raceFromSP.Id,
            title: raceFromSP.Title
          });
        });

        this.setState(() => {
          return {
            completedRaces: races,
            bestOf: races.length - 4
          };
        });

        resolve(true);
      });
    });
  }

  private _getCompletedEntries():void {
    let q: string = `<View><Query><Where><Eq><FieldRef Name='ShowInResults' /><Value Type='Boolean'>1</Value></Eq></Where></Query></View>`;
    var completedEntries:any[] = [];
    this._listService.getListItemsByQuery(this._webUrl, this.LIST_TITLE_ENTRIES, q).then(entriesFromSP => {
      entriesFromSP.value.forEach(entryFromSP => {
        if (completedEntries.filter(v => v.userId === entryFromSP.AuthorId).length === 0) {
          completedEntries.push({
            userId: entryFromSP.AuthorId,
            displayName: entryFromSP.FieldValuesAsText.Author,
            raceEntries: [],
            points_allRaces: 0
          });
        }
        let currentUserEntry:any = completedEntries.filter(v => v.userId === entryFromSP.AuthorId)[0];
        let pointsForRace:number =
          entryFromSP.P1_Points +
          entryFromSP.P2_Points +
          entryFromSP.P3_Points +
          entryFromSP.P4_Points +
          entryFromSP.P5_Points;
        currentUserEntry.raceEntries.push({
          raceId: entryFromSP.RaceId,
          entry_P1: entryFromSP.Entry_P1,
          entry_P2: entryFromSP.Entry_P2,
          entry_P3: entryFromSP.Entry_P3,
          entry_P4: entryFromSP.Entry_P4,
          entry_P5: entryFromSP.Entry_P5,

          points_P1: entryFromSP.P1_Points,
          points_P2: entryFromSP.P2_Points,
          points_P3: entryFromSP.P3_Points,
          points_P4: entryFromSP.P4_Points,
          points_P5: entryFromSP.P5_Points,

          points_total: pointsForRace
        });
        currentUserEntry.points_allRaces += pointsForRace;
      });

      completedEntries.forEach(userEntry => {
        userEntry.topEntries = this._getTopXPoints(userEntry, this.state.bestOf);
      });
      this.setState(() => {
        return {
          allEntries: completedEntries.sort(function (a:any, b:any):number {
            return b.topEntries - a.topEntries;
          })
        };
      });
    });
  }
}