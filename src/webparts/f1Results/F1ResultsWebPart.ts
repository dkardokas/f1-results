import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-webpart-base';

import * as strings from 'F1ResultsWebPartStrings';
import F1Results from './components/F1Results';
import { IF1ResultsProps } from './components/IF1ResultsProps';

export interface IF1ResultsWebPartProps {
  description: string;
}

export default class F1ResultsWebPart extends BaseClientSideWebPart<IF1ResultsWebPartProps> {

  public render(): void {
    const element: React.ReactElement<IF1ResultsProps > = React.createElement(
      F1Results,
      {
        description: this.properties.description,
        context: this.context
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
