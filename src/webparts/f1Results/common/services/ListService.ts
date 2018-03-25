import { Text } from '@microsoft/sp-core-library';
import { SPHttpClient, ISPHttpClientOptions, SPHttpClientResponse } from '@microsoft/sp-http';

export class ListService {

	/***************************************************************************
     * The spHttpClient object used for performing REST calls to SharePoint
     ***************************************************************************/
	private spHttpClient: SPHttpClient;


	/**************************************************************************************************
     * Constructor
     * @param httpClient : The spHttpClient required to perform REST calls against SharePoint
     **************************************************************************************************/
	constructor(spHttpClient: SPHttpClient) {
		this.spHttpClient = spHttpClient;
	}


	/**************************************************************************************************
	 * Performs a CAML query against the specified list and returns the resulting items
	 * @param webUrl : The url of the web which contains the specified list
	 * @param listTitle : The title of the list which contains the elements to query
	 * @param camlQuery : The CAML query to perform on the specified list
	 **************************************************************************************************/
	public getListItemsByQuery(webUrl: string, listTitle: string, camlQuery: string, selectFields?: Array<string>, expandFields?: Array<string>): Promise<any> {
		//var 
		var expandStr:string = "";
		if(expandFields){
			expandStr = "$expand="
			expandFields.forEach(fieldName => expandStr += fieldName + ",");
			expandStr = expandStr.slice(0, -1); // remove extra comma
		} else {
			expandStr = "$expand=FieldValuesAsText,FieldValuesAsHtml";
		}

		var selectStr:string = "";
		if(selectFields){
			selectStr = "&$select=";
			selectFields.forEach(fieldName => selectStr += fieldName + "/Title,");
			selectStr = selectStr.slice(0, -1); // remove extra comma
		}

		return new Promise<any>((resolve, reject) => {
			let endpoint = Text.format("{0}/_api/web/lists/GetByTitle('{1}')/GetItems?" + expandStr + selectStr, webUrl, listTitle);
			let data: any = {
				query: {
					__metadata: { type: "SP.CamlQuery" },
					ViewXml: camlQuery
				}
			};
			let options: ISPHttpClientOptions = { headers: { 'odata-version': '3.0' }, body: JSON.stringify(data) };

			this.spHttpClient.post(endpoint, SPHttpClient.configurations.v1, options)
				.then((postResponse: SPHttpClientResponse) => {
					if (postResponse.ok) {
						resolve(postResponse.json());
					}
					else {
						reject(postResponse);
					}
				})
				.catch((error) => {
					reject(error);
				});
		});
	}


	/**************************************************************************************************
	 * Returns a sorted array of all available list titles for the specified web
	 * @param webUrl : The web URL from which the list titles must be taken from
	 **************************************************************************************************/
	public getListTitlesFromWeb(webUrl: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			let endpoint = Text.format("{0}/_api/web/lists?$select=Title&$filter=(IsPrivate eq false) and (IsCatalog eq false) and (Hidden eq false)", webUrl);
			this.spHttpClient.get(endpoint, SPHttpClient.configurations.v1).then((response: SPHttpClientResponse) => {
				if (response.ok) {
					response.json().then((data: any) => {
						let listTitles: string[] = data.value.map((list) => { return list.Title; });
						resolve(listTitles.sort());
					})
						.catch((error) => { reject(error); });
				}
				else {
					reject(response);
				}
			})
				.catch((error) => { reject(error); });
		});
	}


	/**************************************************************************************************
	 * Returns a sorted array of all available list titles for the specified web
	 * @param webUrl : The web URL from which the specified list is located
	 * @param listTitle : The title of the list from which to load the fields
	 * @param selectProperties : Optionnaly, the select properties to narrow down the query size
	 * @param orderBy : Optionnaly, the by which the results needs to be ordered
	 **************************************************************************************************/
	public getListFields(webUrl: string, listTitle: string, selectProperties?: string[], orderBy?: string): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			let selectProps = selectProperties ? selectProperties.join(',') : '';
			let order = orderBy ? orderBy : 'InternalName';
			let endpoint = Text.format("{0}/_api/web/lists/GetByTitle('{1}')/Fields?$select={2}&$orderby={3}", webUrl, listTitle, selectProps, order);
			this.spHttpClient.get(endpoint, SPHttpClient.configurations.v1).then((response: SPHttpClientResponse) => {
				if (response.ok) {
					resolve(response.json());
				}
				else {
					reject(response);
				}
			})
				.catch((error) => { reject(error); });
		});
	}

	public createItem(siteUrl: string, listName: string, data: any): Promise<boolean> {
		return new Promise<boolean>((resolve: (result: boolean) => void, reject: (error: any) => void): void => {
		this.getListItemEntityTypeName(siteUrl, listName)
			.then((listItemEntityTypeName: string): Promise<SPHttpClientResponse> => {
				let spBody = {
					'__metadata': {
						'type': listItemEntityTypeName
					},
					'Title': `Item ${new Date()}`
				};
				Object.keys(data).forEach(key => {
					spBody[key] = data[key];
				});

				const body: string = JSON.stringify(spBody);

				return this.spHttpClient.post(`${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`,
					SPHttpClient.configurations.v1,
					{
						headers: {
							'Accept': 'application/json;odata=nometadata',
							'Content-type': 'application/json;odata=verbose',
							'odata-version': ''
						},
						body: body
					});
			})
			.then((response: SPHttpClientResponse): void => {
				resolve(true);
			});
		});
	}

	public deleteItem(siteUrl: string, listName: string, id: number): Promise<boolean> {
		return new Promise<boolean>((resolve: (result: boolean) => void, reject: (error: any) => void): void => {
			this.spHttpClient.post(`${siteUrl}/_api/web/lists/getbytitle('${listName}')/items(${id})`,
				SPHttpClient.configurations.v1,
					{
						headers: {
							'Accept': 'application/json;odata=verbose',
							'Content-type': 'application/json;odata=verbose',
							"IF-MATCH": "*",
							"X-HTTP-Method":"DELETE"
						}
					
					}).then((response: SPHttpClientResponse): void => {
						resolve(true);
					});
				});	
	}


	private getListItemEntityTypeName(siteUrl: string, listName: string): Promise<string> {
		return new Promise<string>((resolve: (listItemEntityTypeName: string) => void, reject: (error: any) => void): void => {
			this.spHttpClient.get(`${siteUrl}/_api/web/lists/getbytitle('${listName}')?$select=ListItemEntityTypeFullName`,
				SPHttpClient.configurations.v1,
				{
					headers: {
						'Accept': 'application/json;odata=nometadata',
						'odata-version': ''
					}
				})
				.then((response: SPHttpClientResponse): Promise<{ ListItemEntityTypeFullName: string }> => {
					return response.json();
				}, (error: any): void => {
					reject(error);
				})
				.then((response: { ListItemEntityTypeFullName: string }): void => {
					resolve(response.ListItemEntityTypeFullName);
				});
		});
	}


}